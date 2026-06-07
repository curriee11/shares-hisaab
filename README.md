# Shares Hisab

Shares Hisab is a small browser-based ledger for Hem Securities style share and application hisab. It helps record entries person-wise and stock-wise, calculate profit/loss differences, and show the final settlement as either **we will get** or **we have to give**.

The app runs directly in the browser. No server, database, or installation is required.

## How To Open

Open `index.html` in a browser.

The app saves data in the browser using `localStorage`, so entries remain available when the same browser is opened again.

## Main Idea

Each entry has:

- Person name
- Stock / IPO name
- Deal direction
- Entry type
- Share/application numbers
- Final settlement

The app supports two entry types:

- **Direct shares**: use this when only shares are involved.
- **Application / mixed deal**: use this when applications are involved, or when one entry contains both application lines and direct share lines.

## Deal Direction

The **Deal direction** tells the app who owns the profit or loss.

### We bought from this person

This means we bought shares/applications from that person.

Rules:

```text
Profit  -> We will get
Loss    -> We have to give
```

Example:

```text
We bought from Manish ji
Listing/cost price = 74.50
Sold price = 75.60
Shares = 1000

Difference = 75.60 - 74.50 = 1.10
Result = 1000 x 1.10 = Rs 1100 profit

Final settlement = We will get Rs 1100
```

### We sold to this person

This means the person bought shares/applications from us.

Rules:

```text
Profit  -> We have to give
Loss    -> We will get
```

Example:

```text
Ashok ji bought from us
Listing/cost price = 75.50
Sold price = 75.20
Shares = 1000

Difference = 75.20 - 75.50 = -0.30
Result = 1000 x -0.30 = -Rs 300 loss

Final settlement = We will get Rs 300
```

## Direct Shares Calculation

Use **Direct shares** when one person has only direct shares.

Formula:

```text
Difference per share = sold price - listing price
Calculated result = number of shares x difference per share
```

Then the app applies the deal direction rule to decide the final settlement.

## Application / Mixed Deal Calculation

Use **Application / mixed deal** when the entry has application rows, or both application rows and direct share rows.

### Application Line

Each application line can have different values:

- Applications
- Cost per application
- Shares per application
- Cost price per share
- Listing / sold price per share

Formula:

```text
Total shares = applications x shares per application
Gross result = total shares x (listing/sold price - cost price)
Application cost = applications x cost per application
Line result = gross result - application cost
```

### Share Line Inside Application Deal

Use **Add shares** when the same person and stock also has direct shares in the same entry.

Formula:

```text
Line result = number of shares x (listing/sold price - cost price)
```

All lines are added together before final settlement is decided.

## Summaries

The right side report shows:

- **Total settlement**: overall total across all entries.
- **Total gross profit**: total before application costs.
- **Total charges**: total application costs.
- **Person wise net**: settlement grouped by stock and person.
- **Stock wise net**: settlement grouped by stock / IPO.
- Full entry table with stock, direction, shares, gross, charges, and settlement.

Positive settlement means:

```text
We will get
```

Negative settlement means:

```text
We have to give
```

## Calculation Details

Each entry has a **Calculation** button.

Click it to see:

- Total shares
- Gross profit
- Application cost
- Final settlement
- Direct share formula
- Application/share line formulas
- Reason for the final settlement

This is useful when checking why the app says **we will get** or **we have to give**.

## Editing Entries

Click any entry row in the report table to load it back into the form.

After editing, the button changes to:

```text
Update entry
```

Click **Clear** to leave edit mode and start a new entry.

## Export CSV

Click **CSV** to download the report as a CSV file.

The CSV includes:

- Date
- Person
- Stock
- Direction
- Type
- Shares
- Gross
- Charges
- Final settlement
- Status
- Details
- Notes

## Print Report

Click **Print** to print a detailed report.

The print view includes:

- Summary totals
- Each entry
- Line-by-line calculations
- Final settlement for every entry

## Files

```text
index.html   Main app structure
styles.css   Styling and print layout
app.js       Calculations, storage, rendering, and interactions
```

## Important Note

This app is built for internal hisab and settlement tracking. It is not accounting, tax, or legal software. Always verify important totals manually before final settlement.
