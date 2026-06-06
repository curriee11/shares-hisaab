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
  printDetails: document.querySelector("#printDetails"),
  submitBtn: document.querySelector("#submitBtn"),
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
      sum.finalAmount += entry.finalAmount;
      return sum;
    },
    { gross: 0, charges: 0, finalAmount: 0 },
  );
}

// Screen rendering
function updatePreview() {
  updateLineButtons();
  const result = calculateCurrent();
  document.querySelector("#previewShares").textContent = formatNumber(result.shares);
  document.querySelector("#previewGross").textContent = formatMoney(result.gross);
  document.querySelector("#previewCharges").textContent = formatMoney(result.charges);
  document.querySelector("#previewFinal").textContent = formatMoney(result.finalAmount);
}

function renderEntries() {
  dom.entriesBody.innerHTML = state.entries.length === 0 ? renderEmptyRow() : state.entries.map(renderEntryRow).join("");

  const totals = calculateEntryTotals();
  document.querySelector("#totalFinal").textContent = formatMoney(totals.finalAmount);
  document.querySelector("#totalGross").textContent = formatMoney(totals.gross);
  document.querySelector("#totalCharges").textContent = formatMoney(totals.charges);
  dom.entryCount.textContent = state.entries.length === 1 ? "1 entry" : `${state.entries.length} entries`;
  renderPrintDetails(totals);
}

function renderEmptyRow() {
  return '<tr class="empty-row"><td colspan="8">Add the first entry to start the hisab.</td></tr>';
}

function renderEntryRow(entry) {
  const moneyClass = entry.finalAmount >= 0 ? "money-positive" : "money-negative";
  const selectedClass = entry.id === state.selectedEntryId ? "selected-entry" : "";

  return `
    <tr class="entry-row ${selectedClass}" data-id="${entry.id}">
      <td>${entry.date}</td>
      <td>
        <strong>${escapeHtml(entry.personName)}</strong>
        <div class="entry-meta">${escapeHtml(entry.stockName || "-")}</div>
        ${entry.notes ? `<div class="entry-meta">${escapeHtml(entry.notes)}</div>` : ""}
      </td>
      <td>${entry.type}<div class="entry-meta">${escapeHtml(entry.details)}</div></td>
      <td>${formatNumber(entry.shares)}</td>
      <td>${formatMoney(entry.gross)}</td>
      <td>${formatMoney(entry.charges)}</td>
      <td class="${moneyClass}">${formatMoney(entry.finalAmount)}</td>
      <td class="no-print"><button class="delete-btn" type="button" data-id="${entry.id}">Delete</button></td>
    </tr>
  `;
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
      <div><span>Total final amount</span><strong>${formatMoney(totals.finalAmount)}</strong></div>
      <div><span>Total gross profit</span><strong>${formatMoney(totals.gross)}</strong></div>
      <div><span>Total charges</span><strong>${formatMoney(totals.charges)}</strong></div>
    </div>
    ${state.entries.map((entry, index) => renderPrintEntry(entry, index)).join("")}
  `;
}

function renderPrintEntry(entry, index) {
  const lineRows = entry.type === "Applications" ? renderPrintLineRows(entry.lines || []) : renderSimplePrintLine(entry);

  return `
    <section class="print-entry">
      <div class="print-entry-head">
        <div>
          <h3>${index + 1}. ${escapeHtml(entry.personName)}</h3>
          <p>${escapeHtml(entry.stockName || "-")} | ${entry.date} | ${entry.type}</p>
          ${entry.notes ? `<p>Notes: ${escapeHtml(entry.notes)}</p>` : ""}
        </div>
        <div class="print-entry-total">
          <span>Final amount</span>
          <strong>${formatMoney(entry.finalAmount)}</strong>
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
    notes: textValue("#notes"),
    ...calculated,
  };

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

  const headers = ["Date", "Person", "Stock", "Type", "Shares", "Gross", "Charges", "Final", "Details", "Notes"];
  const rows = state.entries.map((entry) => [
    entry.date,
    entry.personName,
    entry.stockName,
    entry.type,
    entry.shares,
    entry.gross,
    entry.charges,
    entry.finalAmount,
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

// Start
resetDealRows();
setMode("simple");
renderEntries();
