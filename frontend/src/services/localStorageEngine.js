import {
  INITIAL_TENANTS,
  INITIAL_USER,
  INITIAL_ACCOUNTS,
  INITIAL_COUNTERPARTIES,
  INITIAL_BILLING_ACCOUNTS,
  INITIAL_BILLING_PLANS,
  INITIAL_SCHEDULES,
  INITIAL_POLICY_SNAPSHOTS,
  INITIAL_TRANSACTION_SNAPSHOTS,
  INITIAL_FINANCE_AGREEMENTS,
  INITIAL_FISCAL_PERIODS,
  INITIAL_POSTING_RULES,
  INITIAL_CHECKLIST_STEPS
} from './localSeedData';

const KEYS = {
  TENANTS: 'veridex_tenants',
  CURRENT_TENANT: 'veridex_tenant_id',
  USER: 'veridex_user',
  TOKEN: 'veridex_token',
  ACCOUNTS: 'veridex_accounts',
  COUNTERPARTIES: 'veridex_counterparties',
  BILLING_ACCOUNTS: 'veridex_billing_accounts',
  BILLING_PLANS: 'veridex_billing_plans',
  SCHEDULES: 'veridex_schedules',
  INVOICES: 'veridex_invoices',
  PAYMENTS: 'veridex_payments',
  ADJUSTMENTS: 'veridex_adjustments',
  POLICY_SNAPSHOTS: 'veridex_policy_snapshots',
  TRANSACTION_SNAPSHOTS: 'veridex_transaction_snapshots',
  FINANCE_AGREEMENTS: 'veridex_finance_agreements',
  JOURNALS: 'veridex_journals',
  FISCAL_PERIODS: 'veridex_fiscal_periods',
  POSTING_RULES: 'veridex_posting_rules',
  CHECKLIST: 'veridex_checklist',
  FIDUCIARY_ACCOUNTS: 'veridex_fiduciary_accounts',
  BANK_LINES: 'veridex_bank_lines',
  MATCHES: 'veridex_matches',
  COMMISSIONS: 'veridex_commissions',
  SETTINGS: 'veridex_settings'
};

function getItem(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

/**
 * Initialize all datasets into localStorage on application load.
 */
export function initLocalStorage(force = false) {
  if (force || !localStorage.getItem(KEYS.ACCOUNTS) || !localStorage.getItem(KEYS.COUNTERPARTIES)) {
    console.log('[LocalStorageEngine] Seeding initial dataset...');
    setItem(KEYS.TENANTS, INITIAL_TENANTS);
    setItem(KEYS.CURRENT_TENANT, INITIAL_TENANTS[0].id);
    setItem(KEYS.USER, INITIAL_USER);
    setItem(KEYS.TOKEN, 'localstorage-demo-jwt-token');
    setItem(KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    setItem(KEYS.COUNTERPARTIES, INITIAL_COUNTERPARTIES);
    setItem(KEYS.BILLING_ACCOUNTS, INITIAL_BILLING_ACCOUNTS);
    setItem(KEYS.BILLING_PLANS, INITIAL_BILLING_PLANS);
    setItem(KEYS.SCHEDULES, INITIAL_SCHEDULES);
    setItem(KEYS.INVOICES, []);
    setItem(KEYS.PAYMENTS, []);
    setItem(KEYS.ADJUSTMENTS, []);
    setItem(KEYS.POLICY_SNAPSHOTS, INITIAL_POLICY_SNAPSHOTS);
    setItem(KEYS.TRANSACTION_SNAPSHOTS, INITIAL_TRANSACTION_SNAPSHOTS);
    setItem(KEYS.FINANCE_AGREEMENTS, INITIAL_FINANCE_AGREEMENTS);
    setItem(KEYS.JOURNALS, []);
    setItem(KEYS.FISCAL_PERIODS, INITIAL_FISCAL_PERIODS);
    setItem(KEYS.POSTING_RULES, INITIAL_POSTING_RULES);
    setItem(KEYS.CHECKLIST, INITIAL_CHECKLIST_STEPS);
    setItem(KEYS.FIDUCIARY_ACCOUNTS, [
      {
        _id: 'fa-001',
        account_name: 'Premium Trust Bank (Texas § 4053 Segregated)',
        account_number: '•••• 4053',
        bank_name: 'Texas Capital Fiduciary Bank',
        account_type: 'FIDUCIARY_PREMIUM_TRUST',
        currency_code: 'USD',
        jurisdiction_code: 'TX',
        status: 'ACTIVE'
      }
    ]);
    setItem(KEYS.BANK_LINES, [
      {
        _id: 'bl-001',
        statement_line_id: 'STMT-2026-001',
        value_date: '2026-01-08',
        amount: 9562.50,
        description: 'ACH DEPOSIT - LONE PINE TRUCKING INST #1',
        bank_reference: 'ACH-DEP-88991',
        status: 'UNMATCHED'
      }
    ]);
    setItem(KEYS.MATCHES, []);
    setItem(KEYS.COMMISSIONS, [
      {
        _id: 'comm-001',
        agreement_id: 'AGR-SUMMIT-2026',
        carrier_name: 'Summit Mutual Insurance Company',
        carrier_rate_pct: 80.0,
        broker_name: 'Brightline Risk Services LLC',
        broker_split_pct: 10.0,
        mga_override_pct: 10.0,
        status: 'ACTIVE'
      }
    ]);
    setItem(KEYS.SETTINGS, {
      organization_name: 'Harbor MGA Pvt. Ltd.',
      state_jurisdiction: 'Texas (TDI Compliance)',
      fiduciary_statute: 'Texas Insurance Code § 4053',
      default_currency: 'USD',
      auto_posting_enabled: true
    });
  }
}

// Auto-run initialization
initLocalStorage();

/**
 * Double-Entry GL Journal Creation Helper.
 * Automatically posts balanced journals and adjusts Chart of Accounts balances.
 */
function createAndPostJournal(ruleCode, eventName, lines, description, referenceId) {
  const journals = getItem(KEYS.JOURNALS, []);
  const accounts = getItem(KEYS.ACCOUNTS, INITIAL_ACCOUNTS);

  let totalDebit = 0;
  let totalCredit = 0;

  lines.forEach(l => {
    totalDebit += Number(l.debit || 0);
    totalCredit += Number(l.credit || 0);
  });

  const roundedDr = Math.round(totalDebit * 100) / 100;
  const roundedCr = Math.round(totalCredit * 100) / 100;

  if (Math.abs(roundedDr - roundedCr) > 0.01) {
    console.warn(`[GL Posting Warning] Unbalanced journal entry! Dr: ${roundedDr}, Cr: ${roundedCr}`);
  }

  const jeNumber = `JE-2026-${String(journals.length + 1).padStart(5, '0')}`;
  const now = new Date().toISOString();

  const journalEntry = {
    _id: `je-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    journal_number: jeNumber,
    entry_number: jeNumber,
    rule_code: ruleCode,
    event_type: eventName,
    posting_date: now.split('T')[0],
    created_at: now,
    status: 'POSTED',
    is_balanced: true,
    total_debits: roundedDr,
    total_credits: roundedCr,
    description,
    reference_id: referenceId,
    lines: lines.map((l, idx) => ({
      _id: `line-${idx + 1}-${Date.now()}`,
      line_no: idx + 1,
      account_code: l.account_code,
      account_name: l.account_name,
      debit: Number(l.debit || 0),
      credit: Number(l.credit || 0),
      memo: l.memo || description,
      dimensions: l.dimensions || { carrier: 'Summit Mutual', lob: 'Commercial Auto Fleet', policy_number: 'POL-TX-8821' }
    }))
  };

  // Update account balances in Chart of Accounts
  lines.forEach(l => {
    const acc = accounts.find(a => (a.account_code || a.code) === l.account_code);
    if (acc) {
      const dr = Number(l.debit || 0);
      const cr = Number(l.credit || 0);

      acc.total_debits = Math.round(((acc.total_debits || 0) + dr) * 100) / 100;
      acc.debit_activity = acc.total_debits;
      acc.period_debit = acc.total_debits;

      acc.total_credits = Math.round(((acc.total_credits || 0) + cr) * 100) / 100;
      acc.credit_activity = acc.total_credits;
      acc.period_credit = acc.total_credits;
      
      const normal = acc.normal_balance || acc.normal;
      if (normal === 'DEBIT') {
        acc.current_balance = Math.round((acc.total_debits - acc.total_credits) * 100) / 100;
      } else {
        acc.current_balance = Math.round((acc.total_credits - acc.total_debits) * 100) / 100;
      }
      acc.balance = acc.current_balance;
    }
  });

  journals.unshift(journalEntry);
  setItem(KEYS.JOURNALS, journals);
  setItem(KEYS.ACCOUNTS, accounts);

  return journalEntry;
}

/**
 * Storage Engine API Handlers
 */
export const localStorageEngine = {
  // Auth & Profile
  getMe: () => {
    const user = getItem(KEYS.USER, INITIAL_USER);
    const tenants = getItem(KEYS.TENANTS, INITIAL_TENANTS);
    const currentTenantId = localStorage.getItem(KEYS.CURRENT_TENANT) || tenants[0].id;
    const currentWorkspace = tenants.find(t => t.id === currentTenantId) || tenants[0];

    return {
      success: true,
      data: {
        user,
        current_workspace: currentWorkspace,
        available_workspaces: tenants,
        roles: user.roles,
        permissions: ['*'],
        entitlements: ['BILLING', 'GL', 'COMMISSIONS', 'TREASURY', 'CLOSE']
      }
    };
  },

  login: (email, password) => {
    const tenants = getItem(KEYS.TENANTS, INITIAL_TENANTS);
    const user = { ...INITIAL_USER, email: email || INITIAL_USER.email };
    setItem(KEYS.USER, user);
    setItem(KEYS.TOKEN, 'localstorage-demo-jwt-token');
    return {
      success: true,
      data: {
        token: 'localstorage-demo-jwt-token',
        user,
        active_workspace: tenants[0]
      }
    };
  },

  switchWorkspace: (tenant_id) => {
    localStorage.setItem(KEYS.CURRENT_TENANT, tenant_id);
    return { success: true };
  },

  resetDevData: () => {
    initLocalStorage(true);
    return { success: true, message: 'All demo data reset to pristine state successfully.' };
  },

  // General Ledger
  getAccounts: () => ({ success: true, data: getItem(KEYS.ACCOUNTS, INITIAL_ACCOUNTS) }),

  getAccountDetail: (id) => {
    const accounts = getItem(KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    const journals = getItem(KEYS.JOURNALS, []);
    const acc = accounts.find(a => a._id === id || a.id === id || a.account_code === id || a.code === id) || accounts[0];

    // Collect all journal lines for this account code
    const activity = [];
    journals.forEach(j => {
      if (j.lines && Array.isArray(j.lines)) {
        j.lines.forEach(l => {
          if (l.account_code === (acc.account_code || acc.code)) {
            activity.push({
              _id: l._id || `act-${Math.random()}`,
              journal_id: j._id,
              entry_number: j.entry_number || j.journal_number,
              posting_date: j.posting_date,
              description: j.description,
              memo: l.memo || j.description,
              debit: l.debit,
              credit: l.credit,
              balance: acc.current_balance || acc.balance,
              dimensions: l.dimensions
            });
          }
        });
      }
    });

    return {
      success: true,
      data: {
        account: acc,
        activity
      }
    };
  },

  getJournals: () => ({ success: true, data: getItem(KEYS.JOURNALS, []) }),
  getPeriods: () => ({ success: true, data: getItem(KEYS.FISCAL_PERIODS, INITIAL_FISCAL_PERIODS) }),
  getPostingRules: () => ({ success: true, data: getItem(KEYS.POSTING_RULES, INITIAL_POSTING_RULES) }),
  getExchangeRates: () => ({
    success: true,
    data: [
      { from_currency: 'USD', to_currency: 'USD', rate: 1.0000, effective_date: '2026-01-01' },
      { from_currency: 'CAD', to_currency: 'USD', rate: 0.7450, effective_date: '2026-01-01' },
      { from_currency: 'EUR', to_currency: 'USD', rate: 1.0850, effective_date: '2026-01-01' }
    ]
  }),

  getTrialBalance: () => {
    const accounts = getItem(KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    let totalDebit = 0;
    let totalCredit = 0;

    const rows = accounts.map(a => {
      let dr = 0;
      let cr = 0;
      const bal = Number(a.current_balance ?? a.balance ?? 0);
      const normal = a.normal_balance || a.normal;

      if (normal === 'DEBIT') {
        dr = bal > 0 ? bal : 0;
        cr = bal < 0 ? Math.abs(bal) : 0;
      } else {
        cr = bal > 0 ? bal : 0;
        dr = bal < 0 ? Math.abs(bal) : 0;
      }
      totalDebit += dr;
      totalCredit += cr;

      return {
        _id: a._id,
        account_code: a.account_code || a.code,
        account_name: a.account_name || a.name,
        account_type: a.account_type || a.type,
        normal_balance: normal,
        is_fiduciary: Boolean(a.is_fiduciary),
        period_debit: a.total_debits || a.debit_activity || 0,
        period_credit: a.total_credits || a.credit_activity || 0,
        debit: a.total_debits || a.debit_activity || 0,
        credit: a.total_credits || a.credit_activity || 0,
        current_balance: bal,
        debit_balance: dr,
        credit_balance: cr
      };
    });

    const roundedDr = Math.round(totalDebit * 100) / 100;
    const roundedCr = Math.round(totalCredit * 100) / 100;
    const diff = Math.abs(roundedDr - roundedCr);

    return {
      success: true,
      data: {
        accounts: rows,
        total_debits: roundedDr,
        total_credits: roundedCr,
        total_ending_debits: roundedDr,
        total_ending_credits: roundedCr,
        difference: diff.toFixed(2),
        is_balanced: diff < 0.01
      }
    };
  },

  // Counterparties
  getParties: () => ({ success: true, data: getItem(KEYS.COUNTERPARTIES, INITIAL_COUNTERPARTIES) }),

  createParty: (payload) => {
    const parties = getItem(KEYS.COUNTERPARTIES, INITIAL_COUNTERPARTIES);
    const code = payload.party_code || `CP-${(payload.initial_role_type || 'PARTY').toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const newParty = {
      _id: `cp-${Date.now()}`,
      party_id: `cp-${Date.now()}`,
      party_code: code,
      legal_name: payload.legal_name || 'New Organization',
      trade_name: payload.trade_name || payload.legal_name,
      party_name: payload.legal_name,
      party_type: payload.party_type || 'ORGANIZATION',
      roles: [{ _id: `r-${Date.now()}`, role_type: payload.initial_role_type || 'INSURED' }],
      tax_id: payload.tax_id || '—',
      email: payload.email || '—',
      phone: payload.phone || '—',
      status: 'ACTIVE'
    };
    parties.unshift(newParty);
    setItem(KEYS.COUNTERPARTIES, parties);
    return { success: true, data: newParty };
  },

  addPartyRole: (partyId, payload) => {
    const parties = getItem(KEYS.COUNTERPARTIES, INITIAL_COUNTERPARTIES);
    const party = parties.find(p => p._id === partyId || p.party_id === partyId);
    if (party) {
      if (!party.roles) party.roles = [];
      party.roles.push({
        _id: `r-${Date.now()}`,
        role_type: payload.role_type,
        role_details: payload.role_details || {}
      });
      setItem(KEYS.COUNTERPARTIES, parties);
    }
    return { success: true, data: party };
  },

  // Billing & AR
  getBillingAccounts: () => ({ success: true, data: getItem(KEYS.BILLING_ACCOUNTS, INITIAL_BILLING_ACCOUNTS) }),
  getBillingPlans: () => ({ success: true, data: getItem(KEYS.BILLING_PLANS, INITIAL_BILLING_PLANS) }),
  getInstallmentSchedules: () => ({ success: true, data: getItem(KEYS.SCHEDULES, INITIAL_SCHEDULES) }),
  getInvoices: () => ({ success: true, data: getItem(KEYS.INVOICES, []) }),
  getPayments: () => ({ success: true, data: getItem(KEYS.PAYMENTS, []) }),
  getAdjustments: () => ({ success: true, data: getItem(KEYS.ADJUSTMENTS, []) }),
  getPolicySnapshots: () => ({ success: true, data: getItem(KEYS.POLICY_SNAPSHOTS, INITIAL_POLICY_SNAPSHOTS) }),
  getTransactionSnapshots: () => ({ success: true, data: getItem(KEYS.TRANSACTION_SNAPSHOTS, INITIAL_TRANSACTION_SNAPSHOTS) }),
  getFinanceAgreements: () => ({ success: true, data: getItem(KEYS.FINANCE_AGREEMENTS, INITIAL_FINANCE_AGREEMENTS) }),

  // Issue Invoice Action
  issueInvoice: ({ installment_id }) => {
    const schedules = getItem(KEYS.SCHEDULES, INITIAL_SCHEDULES);
    const invoices = getItem(KEYS.INVOICES, []);
    const billingAccounts = getItem(KEYS.BILLING_ACCOUNTS, INITIAL_BILLING_ACCOUNTS);

    const sch = schedules.find(s => s._id === installment_id || s.installment_id === installment_id);
    if (!sch) throw new Error('Installment schedule not found');

    const invNumber = `INV-2026-${String(invoices.length + 1).padStart(5, '0')}`;
    const invId = `inv-${Date.now()}`;
    const now = new Date().toISOString();

    const purePremium = Number(sch.premium_amount || sch.premium || 0);
    const feeAmount = Number(sch.fee_amount || sch.fee || 0);
    const totalAmount = purePremium + feeAmount;

    // Double-Entry GL Journal first
    const glLines = [
      { account_code: '1100', account_name: 'Premium Receivable', debit: totalAmount, credit: 0, memo: `Receivable billed for ${invNumber}` },
      { account_code: '2200', account_name: 'Unearned Premium Reserve (UPR - ASC 944)', debit: 0, credit: purePremium, memo: `UPR Liability for ${invNumber}` },
      ...(feeAmount > 0 ? [{ account_code: '4100', account_name: 'Policy Fee Income', debit: 0, credit: feeAmount, memo: `Policy Fee earned for ${invNumber}` }] : [])
    ];

    const glJournal = createAndPostJournal(
      'RULE_INV_ISSUE',
      'billing.invoice.issued',
      glLines,
      `Double-entry GL posting for customer invoice ${invNumber}`,
      invId
    );

    const newInvoice = {
      _id: invId,
      invoice_id: invId,
      invoice_number: invNumber,
      policy_number: sch.policy_number || sch.policy_id,
      customer_name: sch.customer_name || 'Lone Pine Trucking LLC',
      billing_account_id: { _id: 'ba-001', customer_name: 'Lone Pine Trucking LLC', account_number: 'BA-INSURED-LONEPINE' },
      installment_no: sch.installment_number || sch.installment_no,
      invoice_date: now.split('T')[0],
      due_date: sch.due_date,
      total_amount: totalAmount.toFixed(2),
      amount_paid: '0.00',
      balance_due: totalAmount.toFixed(2),
      currency_code: 'USD',
      status: 'ISSUED',
      journal_id: { _id: glJournal._id, journal_number: glJournal.journal_number },
      lines: [
        {
          line_no: 1,
          line_type: 'PREMIUM',
          description: `Commercial Auto Liability Premium - Installment #${sch.installment_number || sch.installment_no}`,
          amount: purePremium
        },
        ...(feeAmount > 0 ? [{
          line_no: 2,
          line_type: 'FEE',
          description: 'MGA Managing General Agency Policy Fee',
          amount: feeAmount
        }] : [])
      ]
    };

    sch.status = 'BILLED';
    sch.invoice_id = { _id: invId, invoice_number: invNumber };
    sch.invoice_number = invNumber;

    // Update Billing Account AR Balance
    const ba = billingAccounts.find(b => b._id === 'ba-001' || b.account_number === 'BA-INSURED-LONEPINE');
    if (ba) {
      ba.ar_balance = Math.round(((ba.ar_balance || 0) + totalAmount) * 100) / 100;
    }

    invoices.unshift(newInvoice);
    setItem(KEYS.INVOICES, invoices);
    setItem(KEYS.SCHEDULES, schedules);
    setItem(KEYS.BILLING_ACCOUNTS, billingAccounts);

    return {
      success: true,
      data: {
        invoice: newInvoice,
        journal: glJournal
      }
    };
  },

  // Cash Receipt Waterfall Action
  postPaymentReceipt: ({ invoice_id, amount, payment_method }) => {
    const invoices = getItem(KEYS.INVOICES, []);
    const payments = getItem(KEYS.PAYMENTS, []);
    const schedules = getItem(KEYS.SCHEDULES, INITIAL_SCHEDULES);
    const billingAccounts = getItem(KEYS.BILLING_ACCOUNTS, INITIAL_BILLING_ACCOUNTS);

    const inv = invoices.find(i => i._id === invoice_id || i.invoice_id === invoice_id);
    if (!inv) throw new Error('Invoice not found');

    const paidAmt = Number(amount || inv.balance_due);
    const currentPaid = Number(inv.amount_paid || 0);
    const newTotalPaid = Math.round((currentPaid + paidAmt) * 100) / 100;
    const newBalDue = Math.max(0, Math.round((Number(inv.total_amount) - newTotalPaid) * 100) / 100);

    inv.amount_paid = newTotalPaid.toFixed(2);
    inv.balance_due = newBalDue.toFixed(2);
    inv.status = newBalDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

    // Update installment status
    const sch = schedules.find(s => s.invoice_number === inv.invoice_number || (s.invoice_id && s.invoice_id._id === inv._id));
    if (sch) {
      sch.status = 'PAID';
    }

    const pmtId = `pmt-${Date.now()}`;
    const pmtNumber = `PMT-2026-${String(payments.length + 1).padStart(5, '0')}`;
    const now = new Date().toISOString();

    const newPayment = {
      _id: pmtId,
      payment_id: pmtId,
      payment_number: pmtNumber,
      invoice_id: { _id: inv._id, invoice_number: inv.invoice_number },
      invoice_number: inv.invoice_number,
      customer_name: inv.customer_name,
      billing_account_id: { _id: 'ba-001', customer_name: 'Lone Pine Trucking LLC', account_number: 'BA-INSURED-LONEPINE' },
      amount: paidAmt.toFixed(2),
      currency_code: 'USD',
      method: payment_method || 'ACH_TRANSFER',
      fiduciary_trust_account: 'Premium Trust Bank (Texas § 4053)',
      received_at: now,
      status: 'ALLOCATED'
    };

    // Update Billing Account AR Balance
    const ba = billingAccounts.find(b => b._id === 'ba-001' || b.account_number === 'BA-INSURED-LONEPINE');
    if (ba) {
      ba.ar_balance = Math.max(0, Math.round(((ba.ar_balance || 0) - paidAmt) * 100) / 100);
    }

    // Texas § 4053 Waterfall GL allocation (80% Carrier Net, 10% Broker Split, 10% MGA Fee)
    const pureRiskPortion = Math.min(paidAmt, 9412.50);
    const feePortion = paidAmt > 9412.50 ? Math.round((paidAmt - 9412.50) * 100) / 100 : 0;

    const carrierNet = Math.round(pureRiskPortion * 0.80 * 100) / 100; // $7,530.00
    const brokerComm = Math.round(pureRiskPortion * 0.10 * 100) / 100; // $941.25
    const mgaIncome = Math.round((pureRiskPortion * 0.10 + feePortion) * 100) / 100; // $941.25 + $150 = $1,091.25

    const glLines = [
      { account_code: '1010', account_name: 'Premium Trust Bank (Texas § 4053)', debit: paidAmt, credit: 0, memo: `Texas § 4053 fiduciary receipt ${pmtNumber}` },
      { account_code: '1100', account_name: 'Premium Receivable', debit: 0, credit: paidAmt, memo: `Clear AR for ${inv.invoice_number}` },
      { account_code: '2010', account_name: 'Due to Carrier', debit: 0, credit: carrierNet, memo: `Carrier Net Payable (80%) for ${inv.invoice_number}` },
      { account_code: '2020', account_name: 'Broker Commission Payable', debit: 0, credit: brokerComm, memo: `Retail Broker split (10%) for ${inv.invoice_number}` },
      { account_code: '4200', account_name: 'MGA Commission Income', debit: 0, credit: mgaIncome, memo: `MGA fee income recognized for ${inv.invoice_number}` }
    ];

    const glJournal = createAndPostJournal(
      'RULE_PMT_RECEIVED',
      'billing.payment.received',
      glLines,
      `Texas § 4053 Waterfall allocation for payment ${pmtNumber}`,
      pmtId
    );

    payments.unshift(newPayment);
    setItem(KEYS.PAYMENTS, payments);
    setItem(KEYS.INVOICES, invoices);
    setItem(KEYS.SCHEDULES, schedules);
    setItem(KEYS.BILLING_ACCOUNTS, billingAccounts);

    return {
      success: true,
      data: {
        payment: newPayment,
        journal: glJournal
      }
    };
  },

  // Apply Policy Endorsement (Scenario 2 Blended Addition)
  applyEndorsement: ({ policy_number, vehicle_added, delta_premium, sub_scenario }) => {
    const schedules = getItem(KEYS.SCHEDULES, INITIAL_SCHEDULES);
    const delta = Number(delta_premium || 7222.19);

    // Sub-Scenario 2: Distribute delta evenly across remaining unbilled installments (#2, #3, #4)
    const unbilled = schedules.filter(s => s.status === 'SCHEDULED' && (s.installment_number || s.installment_no) > 1);
    if (unbilled.length === 0) throw new Error('No unbilled installments found to spread endorsement delta.');

    const perInst = Math.round((delta / unbilled.length) * 100) / 100;
    unbilled.forEach((s, idx) => {
      const addition = idx === unbilled.length - 1 ? (delta - (perInst * (unbilled.length - 1))) : perInst;
      const currentPrem = Number(s.premium_amount || s.premium || 0);
      const newPrem = Math.round((currentPrem + addition) * 100) / 100;
      s.premium = newPrem;
      s.premium_amount = newPrem;
      s.total_due = newPrem;
      s.total_amount = newPrem;
      if (!s.dimensions) s.dimensions = {};
      s.dimensions.endorsement_delta = addition.toFixed(2);
    });

    setItem(KEYS.SCHEDULES, schedules);

    return {
      success: true,
      message: `Endorsement applied successfully. Delta $${delta.toFixed(2)} spread across ${unbilled.length} remaining installments (New installment: $${unbilled[0].total_amount.toFixed(2)} each). Zero GL entries posted until invoices are issued.`
    };
  },

  // Treasury
  getTreasuryOverview: () => {
    const accounts = getItem(KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    const trustAccount = accounts.find(a => (a.account_code || a.code) === '1010');
    const trustBal = trustAccount ? Number(trustAccount.current_balance || trustAccount.balance || 0) : 0;

    return {
      success: true,
      data: {
        operating_cash: 0.00,
        fiduciary_trust_cash: trustBal,
        claims_escrow_cash: 0.00,
        total_liquidity: trustBal
      }
    };
  },
  getBankStatementLines: () => ({ success: true, data: getItem(KEYS.BANK_LINES, []) }),
  getReconciliationMatches: () => ({ success: true, data: getItem(KEYS.MATCHES, []) }),
  autoReconcile: () => {
    const bankLines = getItem(KEYS.BANK_LINES, []);
    bankLines.forEach(bl => { bl.status = 'MATCHED'; });
    setItem(KEYS.BANK_LINES, bankLines);
    return { success: true, message: 'All active bank statement lines reconciled 100% with fiduciary receipts.' };
  },

  // Finance Close
  getChecklist: () => ({ success: true, data: getItem(KEYS.CHECKLIST, INITIAL_CHECKLIST_STEPS) }),
  executeChecklistStep: (stepNo) => {
    const checklist = getItem(KEYS.CHECKLIST, INITIAL_CHECKLIST_STEPS);
    const item = checklist.find(c => c.step_no === Number(stepNo));
    if (item) {
      item.status = 'COMPLETED';
      item.completed_at = new Date().toISOString();
    }
    setItem(KEYS.CHECKLIST, checklist);
    return { success: true, data: item };
  },
  getCloseOverview: () => ({
    success: true,
    data: {
      fiscal_period: '2026-01 (Jan 2026)',
      status: 'OPEN',
      completed_steps: getItem(KEYS.CHECKLIST, INITIAL_CHECKLIST_STEPS).filter(c => c.status === 'COMPLETED').length,
      total_steps: 7
    }
  }),

  // Commissions
  getCommissionsOverview: () => ({ success: true, data: getItem(KEYS.COMMISSIONS, []) }),
  getFiduciaryAccounts: () => ({ success: true, data: getItem(KEYS.FIDUCIARY_ACCOUNTS, []) }),

  // Dashboard Metrics
  getDashboardMetrics: () => {
    const accounts = getItem(KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    const schedules = getItem(KEYS.SCHEDULES, INITIAL_SCHEDULES);
    const invoices = getItem(KEYS.INVOICES, []);
    const payments = getItem(KEYS.PAYMENTS, []);

    const trustCash = accounts.find(a => (a.account_code || a.code) === '1010')?.current_balance || 0;
    const premiumReceivable = accounts.find(a => (a.account_code || a.code) === '1100')?.current_balance || 0;
    const uprLiability = accounts.find(a => (a.account_code || a.code) === '2200')?.current_balance || 0;
    const carrierPayable = accounts.find(a => (a.account_code || a.code) === '2010')?.current_balance || 0;

    return {
      success: true,
      data: {
        total_gwp: 37650.00,
        fiduciary_trust_balance: trustCash,
        premium_receivable: premiumReceivable,
        unearned_premium_reserve: uprLiability,
        due_to_carrier: carrierPayable,
        active_invoices_count: invoices.length,
        total_payments_count: payments.length,
        unbilled_installments_count: schedules.filter(s => s.status === 'SCHEDULED').length
      }
    };
  }
};
