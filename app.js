const STORAGE_KEY = "shares-hisab-entries-v1";

const dom = {
  form: document.querySelector("#entryForm"),
  modeButtons: document.querySelectorAll(".segment"),
  simpleFields: document.querySelector("#simpleFields"),
  applicationFields: document.querySelector("#applicationFields"),
  dealRows: document.querySelector("#applicationRows"),
  addShareLineBtn: document.querySelector("#addShareLineBtn"),
  entriesBody: document.querySelector("#entriesBody"),
  entryCount: document.querySelector("#entryCount"),
  personSummaryBody: document.querySelector("#personSummaryBody"),
  stockSummaryBody: document.querySelector("#stockSummaryBody"),
  printDetails: document.querySelector("#printDetails"),
  submitBtn: document.querySelector("#submitBtn"),
  calculationModal: document.querySelector("#calculationModal"),
  calculationSubtitle: document.querySelector("#calculationSubtitle"),
  calculationBody: document.querySelector("#calculationBody"),
};

const formatters = {
  money: new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }),
  number: new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }),
};

const state = {
  mode: "simple",
  entries: loadEntries(),
  selectedEntryId: null,
};

// Helpers
function value(id) {
  return Number.parseFloat(document.querySelector(id).value) || 0;
}

function textValue(id) {
  return document.querySelector(id).value.trim();
}

function setField(id, fieldValue) {
  document.querySelector(id).value = fieldValue ?? "";
}

function lineValue(row, selector) {
  return Number.parseFloat(row.querySelector(selector).value) || 0;
}

function formatMoney(amount) {
  return formatters.money.format(amount || 0).replace("₹", "Rs ");
}

function formatNumber(amount) {
  return formatters.number.format(amount || 0);
}

function getSignedAmount(entry) {
  return getDirectionMultiplier(entry.direction) * (Number(entry.finalAmount) || 0);
}

function getDirectionMultiplier(direction) {
  return direction === "buy" ? 1 : -1;
}

function getDirectionLabel(direction) {
  return direction === "buy" ? "Bought from person" : "Sold to person";
}

function getEntryResultStatus(entry) {
  const amount = getSignedAmount(entry);

  if (amount > 0) return "We will get";
  if (amount < 0) return "We have to give";
  return "Settled";
}

function getEntryResultStatusWithAmount(entry) {
  const amount = getSignedAmount(entry);
  if (amount === 0) return "Settled, no money to give or receive";
  const personName = entry.personName || "person";
  return amount > 0 ? `${personName} will give us ${formatMoney(Math.abs(amount))}` : `We will give ${personName} ${formatMoney(Math.abs(amount))}`;
}

function getBalanceStatus(amount) {
  if (amount > 0) return "We will get";
  if (amount < 0) return "We have to give";
  return "Settled";
}

function getBalanceClass(amount) {
  if (amount > 0) return "money-positive";
  if (amount < 0) return "money-negative";
  return "";
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(valueToEscape) {
  return String(valueToEscape)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Storage
function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

// Dynamic line UI
function createApplicationLine(values = {}) {
  const row = document.createElement("div");
  row.className = "deal-line application-line";
  row.innerHTML = `
    <div class="line-badge">Application</div>
    <label>
      Applications
      <input class="app-count" inputmode="decimal" type="number" min="0" step="1" placeholder="50" value="${values.applications ?? ""}" />
    </label>
    <label>
      Cost per application
      <input class="app-cost" inputmode="decimal" type="number" min="0" step="0.01" placeholder="2800" value="${values.costPerApplication ?? ""}" />
    </label>
    <label>
      Shares per application
      <input class="app-shares" inputmode="decimal" type="number" min="0" step="1" placeholder="2670" value="${values.sharesPerApplication ?? ""}" />
    </label>
    <label>
      Cost price per share
      <input class="app-cost-price" inputmode="decimal" type="number" min="0" step="0.01" placeholder="72.85" value="${values.costPrice ?? ""}" />
    </label>
    <label>
      Listing / sold price per share
      <input class="app-sold-price" inputmode="decimal" type="number" min="0" step="0.01" placeholder="74.70" value="${values.soldPrice ?? ""}" />
    </label>
    <button class="delete-btn remove-line-btn" type="button">Remove</button>
  `;
  dom.dealRows.append(row);
}

function createShareLine(values = {}) {
  const row = document.createElement("div");
  row.className = "deal-line share-line";
  row.innerHTML = `
    <div class="line-badge">Shares</div>
    <label>
      Number of shares
      <input class="share-count" inputmode="decimal" type="number" min="0" step="1" placeholder="1000" value="${values.shares ?? ""}" />
    </label>
    <label>
      Cost price per share
      <input class="share-cost-price" inputmode="decimal" type="number" min="0" step="0.01" placeholder="72.85" value="${values.costPrice ?? ""}" />
    </label>
    <label>
      Listing / sold price per share
      <input class="share-sold-price" inputmode="decimal" type="number" min="0" step="0.01" placeholder="74.70" value="${values.soldPrice ?? ""}" />
    </label>
    <button class="delete-btn remove-line-btn" type="button">Remove</button>
  `;
  dom.dealRows.append(row);
}

function resetDealRows() {
  dom.dealRows.innerHTML = "";
  createApplicationLine();
  updateLineButtons();
}

function hasApplicationEntered() {
  return [...dom.dealRows.querySelectorAll(".application-line")].some((row) => lineValue(row, ".app-count") > 0);
}

function updateLineButtons() {
  dom.addShareLineBtn.disabled = !hasApplicationEntered();
}

// Calculations
function getDealLines() {
  return [...dom.dealRows.querySelectorAll(".deal-line")]
    .map((row) => (row.classList.contains("share-line") ? readShareLine(row) : readApplicationLine(row)))
    .filter((line) => line.applications || line.costPerApplication || line.sharesPerApplication || line.shares || line.costPrice || line.soldPrice);
}

function readApplicationLine(row) {
  const applications = lineValue(row, ".app-count");
  const costPerApplication = lineValue(row, ".app-cost");
  const sharesPerApplication = lineValue(row, ".app-shares");
  const costPrice = lineValue(row, ".app-cost-price");
  const soldPrice = lineValue(row, ".app-sold-price");
  const shares = applications * sharesPerApplication;
  const gross = shares * (soldPrice - costPrice);
  const charges = applications * costPerApplication;

  return {
    kind: "application",
    applications,
    costPerApplication,
    sharesPerApplication,
    costPrice,
    soldPrice,
    shares,
    gross,
    charges,
    finalAmount: gross - charges,
  };
}

function readShareLine(row) {
  const shares = lineValue(row, ".share-count");
  const costPrice = lineValue(row, ".share-cost-price");
  const soldPrice = lineValue(row, ".share-sold-price");
  const gross = shares * (soldPrice - costPrice);

  return {
    kind: "shares",
    applications: 0,
    costPerApplication: 0,
    sharesPerApplication: 0,
    costPrice,
    soldPrice,
    shares,
    gross,
    charges: 0,
    finalAmount: gross,
  };
}

function calculateCurrent() {
  return state.mode === "simple" ? calculateSimpleShareDeal() : calculateApplicationDeal();
}

function calculateSimpleShareDeal() {
  const shares = value("#simpleShares");
  const basePrice = value("#simpleBasePrice");
  const soldPrice = value("#simpleSoldPrice");
  const gross = shares * (soldPrice - basePrice);

  return {
    type: "Shares",
    shares,
    basePrice,
    soldPrice,
    gross,
    charges: 0,
    finalAmount: gross,
    details: `Sold ${formatNumber(shares)} shares at Rs ${soldPrice || 0}; base Rs ${basePrice || 0}`,
  };
}

function calculateApplicationDeal() {
  const lines = getDealLines();
  const totals = lines.reduce(
    (sum, line) => {
      sum.applications += line.applications;
      sum.shares += line.shares;
      sum.gross += line.gross;
      sum.charges += line.charges;
      return sum;
    },
    { applications: 0, shares: 0, gross: 0, charges: 0 },
  );

  return {
    type: "Applications",
    shares: totals.shares,
    gross: totals.gross,
    charges: totals.charges,
    finalAmount: totals.gross - totals.charges,
    details: formatDealLineDetails(lines),
    lines,
  };
}

function formatDealLineDetails(lines) {
  if (lines.length === 0) return "No application lines entered";

  return lines
    .map((line, index) => {
      if (line.kind === "shares") {
        return `Line ${index + 1}: ${formatNumber(line.shares)} shares, cost Rs ${line.costPrice || 0}, listing/sold Rs ${line.soldPrice || 0}`;
      }
      return `Line ${index + 1}: ${formatNumber(line.applications)} apps x ${formatNumber(line.sharesPerApplication)} shares, cost Rs ${line.costPrice || 0}, listing/sold Rs ${line.soldPrice || 0}`;
    })
    .join("; ");
}

function calculateEntryTotals() {
  return state.entries.reduce(
    (sum, entry) => {
      sum.gross += entry.gross;
      sum.charges += entry.charges;
      sum.finalAmount += getSignedAmount(entry);
      return sum;
    },
    { gross: 0, charges: 0, finalAmount: 0 },
  );
}

// Screen rendering
function updatePreview() {
  updateLineButtons();
  const result = calculateCurrent();
  const signedAmount = getDirectionMultiplier(textValue("#transactionType") || "sell") * result.finalAmount;
  document.querySelector("#previewShares").textContent = formatNumber(result.shares);
  document.querySelector("#previewGross").textContent = formatMoney(result.gross);
  document.querySelector("#previewCharges").textContent = formatMoney(result.charges);
  document.querySelector("#previewFinal").textContent = formatMoney(signedAmount);
}

function renderEntries() {
  dom.entriesBody.innerHTML = state.entries.length === 0 ? renderEmptyRow() : state.entries.map(renderEntryRow).join("");

  const totals = calculateEntryTotals();
  document.querySelector("#totalFinal").textContent = formatMoney(totals.finalAmount);
  document.querySelector("#totalGross").textContent = formatMoney(totals.gross);
  document.querySelector("#totalCharges").textContent = formatMoney(totals.charges);
  dom.entryCount.textContent = state.entries.length === 1 ? "1 entry" : `${state.entries.length} entries`;
  renderBalanceSummaries();
  renderPrintDetails(totals);
}

function renderEmptyRow() {
  return '<tr class="empty-row"><td colspan="10">Add the first entry to start the hisab.</td></tr>';
}

function renderEntryRow(entry) {
  const signedAmount = getSignedAmount(entry);
  const moneyClass = getBalanceClass(signedAmount);
  const selectedClass = entry.id === state.selectedEntryId ? "selected-entry" : "";

  return `
    <tr class="entry-row ${selectedClass}" data-id="${entry.id}">
      <td>${entry.date}</td>
      <td>
        <strong>${escapeHtml(entry.personName)}</strong>
        ${entry.notes ? `<div class="entry-meta">${escapeHtml(entry.notes)}</div>` : ""}
      </td>
      <td>${escapeHtml(entry.stockName || "-")}</td>
      <td>${getDirectionLabel(entry.direction)}</td>
      <td>${entry.type}<div class="entry-meta">${escapeHtml(entry.details)}</div></td>
      <td>${formatNumber(entry.shares)}</td>
      <td>${formatMoney(entry.gross)}</td>
      <td>${formatMoney(entry.charges)}</td>
      <td class="${moneyClass}">${formatMoney(signedAmount)}<div class="entry-meta">${getEntryResultStatusWithAmount(entry)}</div></td>
      <td class="no-print action-cell">
        <button class="calc-btn" type="button" data-id="${entry.id}">Calculation</button>
        <button class="delete-btn" type="button" data-id="${entry.id}">Delete</button>
      </td>
    </tr>
  `;
}

function openCalculationDetails(entry) {
  dom.calculationSubtitle.textContent = `${entry.personName} | ${entry.stockName || "-"} | ${getDirectionLabel(entry.direction)}`;
  dom.calculationBody.innerHTML = renderCalculationDetails(entry);
  dom.calculationModal.classList.remove("hidden");
}

function closeCalculationDetails() {
  dom.calculationModal.classList.add("hidden");
}

function renderCalculationDetails(entry) {
  const signedAmount = getSignedAmount(entry);
  const settlementAmount = Math.abs(entry.finalAmount || 0);
  const finalMeaning = getEntryResultStatusWithAmount(entry);
  const signText =
    signedAmount > 0
      ? "we will receive money"
      : signedAmount < 0
        ? "we have to pay money"
        : "zero, so it is settled";

  return `
    <div class="calc-summary">
      <div><span>Total shares</span><strong>${formatNumber(entry.shares)}</strong></div>
      <div><span>Gross profit</span><strong>${formatMoney(entry.gross)}</strong></div>
      <div><span>Application cost</span><strong>${formatMoney(entry.charges)}</strong></div>
      <div><span>Final settlement</span><strong class="${getBalanceClass(signedAmount)}">${formatMoney(signedAmount)}</strong></div>
    </div>
    <div class="calc-note ${getBalanceClass(signedAmount)}">${finalMeaning}</div>
    ${entry.type === "Applications" ? renderApplicationCalculation(entry.lines || []) : renderShareCalculation(entry)}
    <div class="calc-section">
      <h3>Final net with direction</h3>
      <p>Calculated difference: <strong>${formatMoney(entry.finalAmount)}</strong></p>
      <p>Absolute amount: <strong>${formatMoney(settlementAmount)}</strong></p>
      <p>Direction: <strong>${getDirectionLabel(entry.direction)}</strong></p>
      <p>Final settlement: <strong>${finalMeaning}</strong></p>
      <p>${signText}.</p>
      <p>${renderDirectionReason(entry)}</p>
    </div>
  `;
}

function renderDirectionReason(entry) {
  const personName = escapeHtml(entry.personName || "this person");

  if (entry.direction === "sell") {
    return `Rule: <strong>${personName}</strong> bought from us. If the difference is profit, ${personName} gets it and we give. If the difference is loss, ${personName} bears it and gives us.`;
  }

  if (entry.direction === "buy") {
    return `Rule: we bought from <strong>${personName}</strong>. If the difference is profit, we get it. If the difference is loss, we bear it and give.`;
  }

  return "Rule: direction and profit/loss decide who gives money.";
}

function renderShareCalculation(entry) {
  const difference = (entry.soldPrice || 0) - (entry.basePrice || 0);
  const reason =
    difference < 0
      ? "Sold price is lower than listing price, so this is a loss."
      : difference > 0
        ? "Sold price is higher than listing price, so this is profit."
        : "Sold price and listing price are equal, so there is no profit or loss.";

  return `
    <div class="calc-section">
      <h3>Direct shares</h3>
      <p>Shares: <strong>${formatNumber(entry.shares)}</strong></p>
      <p>Listing price: <strong>${formatMoney(entry.basePrice)}</strong></p>
      <p>Sold price: <strong>${formatMoney(entry.soldPrice)}</strong></p>
      <p>Difference per share: <strong>${formatMoney(difference)}</strong></p>
      <p>Formula: <strong>${formatNumber(entry.shares)} x (${formatMoney(entry.soldPrice)} - ${formatMoney(entry.basePrice)}) = ${formatMoney(entry.finalAmount)}</strong></p>
      <p>Why: <strong>${reason}</strong></p>
    </div>
  `;
}

function renderApplicationCalculation(lines) {
  if (lines.length === 0) {
    return '<div class="calc-section"><h3>Lines</h3><p>No application/share lines saved for this entry.</p></div>';
  }

  return `
    <div class="calc-section">
      <h3>Line by line</h3>
      ${lines.map(renderCalculationLine).join("")}
    </div>
  `;
}

function renderCalculationLine(line, index) {
  if (line.kind === "shares") {
    const difference = (line.soldPrice || 0) - (line.costPrice || 0);
    return `
      <div class="calc-line">
        <h4>Line ${index + 1}: Direct shares</h4>
        <p>Shares: <strong>${formatNumber(line.shares)}</strong></p>
        <p>Difference per share: <strong>${formatMoney(line.soldPrice)} - ${formatMoney(line.costPrice)} = ${formatMoney(difference)}</strong></p>
        <p>Gross: <strong>${formatNumber(line.shares)} x ${formatMoney(difference)} = ${formatMoney(line.gross)}</strong></p>
        <p>Charges: <strong>${formatMoney(line.charges)}</strong></p>
        <p>Line final: <strong>${formatMoney(line.finalAmount)}</strong></p>
      </div>
    `;
  }

  const difference = (line.soldPrice || 0) - (line.costPrice || 0);
  return `
    <div class="calc-line">
      <h4>Line ${index + 1}: Application</h4>
      <p>Total shares: <strong>${formatNumber(line.applications)} applications x ${formatNumber(line.sharesPerApplication)} shares = ${formatNumber(line.shares)}</strong></p>
      <p>Difference per share: <strong>${formatMoney(line.soldPrice)} - ${formatMoney(line.costPrice)} = ${formatMoney(difference)}</strong></p>
      <p>Gross: <strong>${formatNumber(line.shares)} x ${formatMoney(difference)} = ${formatMoney(line.gross)}</strong></p>
      <p>Application cost: <strong>${formatNumber(line.applications)} x ${formatMoney(line.costPerApplication)} = ${formatMoney(line.charges)}</strong></p>
      <p>Line final: <strong>${formatMoney(line.gross)} - ${formatMoney(line.charges)} = ${formatMoney(line.finalAmount)}</strong></p>
    </div>
  `;
}

function renderBalanceSummaries() {
  const personBalances = buildGroupedBalances((entry) => `${entry.stockName || "-"}|||${entry.personName}`);
  const stockBalances = buildGroupedBalances((entry) => entry.stockName || "-");

  dom.personSummaryBody.innerHTML =
    personBalances.length === 0
      ? '<tr class="empty-row"><td colspan="4">No balances yet.</td></tr>'
      : personBalances
          .map((balance) => {
            const [stockName, personName] = balance.key.split("|||");
            return `
              <tr>
                <td>${escapeHtml(stockName)}</td>
                <td>${escapeHtml(personName)}</td>
                <td class="${getBalanceClass(balance.amount)}">${formatMoney(balance.amount)}</td>
                <td>${getBalanceStatus(balance.amount)}</td>
              </tr>
            `;
          })
          .join("");

  dom.stockSummaryBody.innerHTML =
    stockBalances.length === 0
      ? '<tr class="empty-row"><td colspan="3">No stock totals yet.</td></tr>'
      : stockBalances
          .map((balance) => {
            return `
              <tr>
                <td>${escapeHtml(balance.key)}</td>
                <td class="${getBalanceClass(balance.amount)}">${formatMoney(balance.amount)}</td>
                <td>${getBalanceStatus(balance.amount)}</td>
              </tr>
            `;
          })
          .join("");
}

function buildGroupedBalances(getKey) {
  const balances = new Map();

  state.entries.forEach((entry) => {
    const key = getKey(entry);
    balances.set(key, (balances.get(key) || 0) + getSignedAmount(entry));
  });

  return [...balances.entries()]
    .map(([key, amount]) => ({ key, amount }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

// Print rendering
function renderPrintDetails(totals) {
  if (state.entries.length === 0) {
    dom.printDetails.innerHTML = "";
    return;
  }

  dom.printDetails.innerHTML = `
    <div class="print-title">
      <h2>Detailed Hisab Report</h2>
      <p>Generated on ${new Date().toLocaleDateString("en-IN")}</p>
    </div>
    <div class="print-summary">
      <div><span>Total settlement</span><strong>${formatMoney(totals.finalAmount)}</strong></div>
      <div><span>Total gross profit</span><strong>${formatMoney(totals.gross)}</strong></div>
      <div><span>Total charges</span><strong>${formatMoney(totals.charges)}</strong></div>
    </div>
    ${state.entries.map((entry, index) => renderPrintEntry(entry, index)).join("")}
  `;
}

function renderPrintEntry(entry, index) {
  const signedAmount = getSignedAmount(entry);
  const lineRows = entry.type === "Applications" ? renderPrintLineRows(entry.lines || []) : renderSimplePrintLine(entry);

  return `
    <section class="print-entry">
      <div class="print-entry-head">
        <div>
          <h3>${index + 1}. ${escapeHtml(entry.personName)}</h3>
          <p>${escapeHtml(entry.stockName || "-")} | ${entry.date} | ${entry.type} | ${getDirectionLabel(entry.direction)}</p>
          ${entry.notes ? `<p>Notes: ${escapeHtml(entry.notes)}</p>` : ""}
        </div>
        <div class="print-entry-total">
          <span>Final settlement</span>
          <strong>${formatMoney(signedAmount)}</strong>
          <p>${getEntryResultStatusWithAmount(entry)}</p>
        </div>
      </div>
      <table class="print-line-table">
        <thead>
          <tr>
            <th>Line</th>
            <th>Qty</th>
            <th>Shares</th>
            <th>Cost price</th>
            <th>Listing / sold price</th>
            <th>Gross</th>
            <th>Charges</th>
            <th>Final</th>
          </tr>
        </thead>
        <tbody>${lineRows}</tbody>
      </table>
    </section>
  `;
}

function renderSimplePrintLine(entry) {
  return `
    <tr>
      <td>Share sale</td>
      <td>${formatNumber(entry.shares)}</td>
      <td>${formatNumber(entry.shares)}</td>
      <td>${formatMoney(entry.basePrice)}</td>
      <td>${formatMoney(entry.soldPrice)}</td>
      <td>${formatMoney(entry.gross)}</td>
      <td>${formatMoney(entry.charges)}</td>
      <td>${formatMoney(entry.finalAmount)}</td>
    </tr>
  `;
}

function renderPrintLineRows(lines) {
  if (lines.length === 0) return '<tr><td colspan="8">No lines saved for this entry.</td></tr>';

  return lines.map(renderPrintLineRow).join("");
}

function renderPrintLineRow(line, index) {
  if (line.kind === "shares") {
    return `
      <tr>
        <td>Shares ${index + 1}</td>
        <td>${formatNumber(line.shares)}</td>
        <td>${formatNumber(line.shares)}</td>
        <td>${formatMoney(line.costPrice)}</td>
        <td>${formatMoney(line.soldPrice)}</td>
        <td>${formatMoney(line.gross)}</td>
        <td>${formatMoney(line.charges)}</td>
        <td>${formatMoney(line.finalAmount)}</td>
      </tr>
    `;
  }

  return `
    <tr>
      <td>Application ${index + 1}</td>
      <td>${formatNumber(line.applications)} apps</td>
      <td>${formatNumber(line.shares)}<br><span>${formatNumber(line.sharesPerApplication)} per app</span></td>
      <td>${formatMoney(line.costPrice)}</td>
      <td>${formatMoney(line.soldPrice)}</td>
      <td>${formatMoney(line.gross)}</td>
      <td>${formatMoney(line.charges)}<br><span>${formatMoney(line.costPerApplication)} per app</span></td>
      <td>${formatMoney(line.finalAmount)}</td>
    </tr>
  `;
}

// Form actions
function setMode(nextMode) {
  state.mode = nextMode;
  dom.modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === nextMode);
  });
  dom.simpleFields.classList.toggle("hidden", nextMode !== "simple");
  dom.applicationFields.classList.toggle("hidden", nextMode !== "application");
  document.querySelector("#notesStep").textContent = "3";
  updatePreview();
}

function resetForm() {
  state.selectedEntryId = null;
  dom.form.reset();
  resetDealRows();
  dom.submitBtn.textContent = "Add entry";
  renderEntries();
  updatePreview();
}

function saveFormEntry(event) {
  event.preventDefault();
  const calculated = calculateCurrent();
  const personName = textValue("#personName");

  if (!personName) {
    document.querySelector("#personName").focus();
    return;
  }

  const existingEntry = state.entries.find((entry) => entry.id === state.selectedEntryId);
  const nextEntry = {
    id: state.selectedEntryId || createId(),
    date: existingEntry?.date || new Date().toLocaleDateString("en-IN"),
    personName,
    stockName: textValue("#stockName"),
    direction: textValue("#transactionType") || "sell",
    notes: textValue("#notes"),
    ...calculated,
  };
  nextEntry.signedFinalAmount = getDirectionMultiplier(nextEntry.direction) * nextEntry.finalAmount;

  if (state.selectedEntryId) {
    state.entries = state.entries.map((entry) => (entry.id === state.selectedEntryId ? nextEntry : entry));
  } else {
    state.entries.unshift(nextEntry);
  }

  saveEntries();
  resetForm();
}

function deleteEntry(id) {
  state.entries = state.entries.filter((entry) => entry.id !== id);
  const wasSelected = state.selectedEntryId === id;
  if (wasSelected) state.selectedEntryId = null;
  saveEntries();
  if (wasSelected) {
    resetForm();
    return;
  }
  renderEntries();
}

function fillFormFromEntry(entry) {
  state.selectedEntryId = entry.id;
  setField("#personName", entry.personName);
  setField("#stockName", entry.stockName);
  setField("#transactionType", entry.direction || "sell");
  setField("#notes", entry.notes);

  if (entry.type === "Shares") {
    fillSimpleShareForm(entry);
  } else {
    fillApplicationDealForm(entry);
  }

  dom.submitBtn.textContent = "Update entry";
  renderEntries();
  updatePreview();
  document.querySelector("#entryTitle").scrollIntoView({ behavior: "smooth", block: "start" });
}

function fillSimpleShareForm(entry) {
  setMode("simple");
  setField("#simpleShares", entry.shares);
  setField("#simpleBasePrice", entry.basePrice);
  setField("#simpleSoldPrice", entry.soldPrice);
}

function fillApplicationDealForm(entry) {
  setMode("application");
  dom.dealRows.innerHTML = "";
  const lines = Array.isArray(entry.lines) && entry.lines.length > 0 ? entry.lines : [];

  if (lines.length === 0) {
    createApplicationLine();
    return;
  }

  lines.forEach((line) => {
    if (line.kind === "shares") {
      createShareLine(line);
    } else {
      createApplicationLine(line);
    }
  });
}

function exportCsv() {
  if (state.entries.length === 0) return;

  const headers = ["Date", "Person", "Stock", "Direction", "Type", "Shares", "Gross", "Charges", "Net", "Status", "Details", "Notes"];
  const rows = state.entries.map((entry) => [
    entry.date,
    entry.personName,
    entry.stockName,
    getDirectionLabel(entry.direction),
    entry.type,
    entry.shares,
    entry.gross,
    entry.charges,
    getSignedAmount(entry),
    getEntryResultStatusWithAmount(entry),
    entry.details,
    entry.notes,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `shares-hisab-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Events
dom.modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

dom.form.addEventListener("input", updatePreview);
dom.form.addEventListener("submit", saveFormEntry);
dom.form.addEventListener("keydown", preventNumberStepKeys);
dom.form.addEventListener("wheel", preventNumberWheelChange, { passive: false });

document.querySelector("#resetBtn").addEventListener("click", resetForm);
document.querySelector("#addApplicationLineBtn").addEventListener("click", () => {
  createApplicationLine();
  updatePreview();
});
document.querySelector("#addShareLineBtn").addEventListener("click", () => {
  if (dom.addShareLineBtn.disabled) return;
  createShareLine();
  updatePreview();
});
document.querySelector("#printBtn").addEventListener("click", () => window.print());
document.querySelector("#exportBtn").addEventListener("click", exportCsv);
document.querySelector("#clearAllBtn").addEventListener("click", () => {
  if (state.entries.length > 0 && confirm("Clear all hisab entries?")) {
    state.entries = [];
    state.selectedEntryId = null;
    saveEntries();
    resetForm();
  }
});

dom.entriesBody.addEventListener("click", (event) => {
  const calcButton = event.target.closest(".calc-btn");
  if (calcButton) {
    const entry = state.entries.find((item) => item.id === calcButton.dataset.id);
    if (entry) openCalculationDetails(entry);
    return;
  }

  const button = event.target.closest(".delete-btn");
  if (button) {
    deleteEntry(button.dataset.id);
    return;
  }

  const row = event.target.closest(".entry-row");
  if (!row) return;

  const entry = state.entries.find((item) => item.id === row.dataset.id);
  if (entry) fillFormFromEntry(entry);
});

document.querySelector("#closeCalculationBtn").addEventListener("click", closeCalculationDetails);
dom.calculationModal.addEventListener("click", (event) => {
  if (event.target === dom.calculationModal) closeCalculationDetails();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCalculationDetails();
});

dom.dealRows.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-line-btn");
  if (!button) return;

  if (dom.dealRows.querySelectorAll(".deal-line").length === 1) {
    button.closest(".deal-line").querySelectorAll("input").forEach((input) => {
      input.value = "";
    });
  } else {
    button.closest(".deal-line").remove();
  }
  updatePreview();
});

function preventNumberStepKeys(event) {
  if (event.target.type === "number" && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
    event.preventDefault();
  }
}

function preventNumberWheelChange(event) {
  if (event.target.type === "number" && document.activeElement === event.target) {
    event.preventDefault();
  }
}

// Start
resetDealRows();
setMode("simple");
renderEntries();
