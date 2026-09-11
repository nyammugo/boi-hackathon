# Investment chat acceptance transcript

Tested 11 September 2026 against live BOI staging, using the exact questions in order in one saved conversation. Five selected collections, 14 source documents. This is observed model output, including mistakes, not endorsed product guidance. Question 15 succeeded on retry after an upstream rate limit.

Conversation: `cac805fb-1214-4708-98ee-936c40574b9b`

## 1. I’m new to investing. Explain the Emerald plan in plain English.

Here's the Demo Emerald Participation Plan 2026 explained simply — note this is a **fictional demonstration product**, not a real one available to buy, and not a Bank of Ireland or New Ireland product[^1].

**What it is**
- It's a single-payment life-assurance investment plan from a fictional provider ("Team 25 Demo Life")[^1]. You pay in a lump sum of at least €10,000, and there's a five-year term (in the example, 11 September 2026 to 11 September 2031)[^2].
- You don't buy shares directly — instead, your payout at the end depends on how the EURO STOXX 50 index (a basket of euro-area company shares) moves over those five years[^2]. You don't get dividends or regular income along the way[^2].
- It's a "one and done" arrangement: no top-ups and no partial withdrawals allowed[^2].

**Where your money goes**
- Out of every €10,000 paid in, €100 covers an initial product charge and €100 covers a government levy, leaving €9,800 actually allocated to your plan[^2][^3].

**How growth works**
- If the index rises, you get "120% participation" — meaning you get one-and-a-fifth times the positive growth, not a 120% return on your whole investment[^3]. For example, a 10% rise in the index turns into 12% growth applied to your €9,800, giving €10,976 before tax[^3].
- There's a cap: total growth can't exceed 30% over the five years, which is reached once the index rises by 25% or more (120% × 25% = 30%). Even if the index rises much further, your payout doesn't increase beyond that cap — the maximum before-tax payment is €12,740[^3].
- If the index is flat or falls, you still get back the €9,800 allocated amount at maturity (not the full €10,000 you originally paid) — but only if the provider is able to pay[^3][^4].

**What you could lose**
- Because only 98% of your payment is allocated, getting back just that "protected" amount still means a €200 loss on your original €10,000[^4].
- The maturity promise depends entirely on the provider being able to pay — there is no state or deposit guarantee, so provider failure could mean losing some or all of your money, including the supposedly "protected" part[^4].
- Inflation can also erode the real value of whatever you get back[^4].

**Getting your money out early**
- You have a 30-calendar-day cooling-off period after receiving your policy pack, during which you can cancel and get your full original payment back with no charge[^5][^2].
- After that, the maturity promise no longer applies. You'd need a full surrender (no partial withdrawals), where the provider gives you a market-value quote, minus a 1% surrender charge[^5]. There's no floor on this — you could get back less than your €9,800 allocated amount, and losses can exceed the initial deductions[^5][^6]. For example, a hypothetical year-two quote of €8,500 would net €8,415 after the surrender charge, well below your original €10,000[^6].
- Processing normally takes about five Irish banking business days once a quote is accepted and identity checks are done[^5].

**Who it's aimed at**
- This is designed for an ordinary Irish-resident adult (18+) who can leave the money untouched for the full five years, has separate emergency savings elsewhere, understands the loss and access conditions, and accepts that growth is capped[^7]. Understanding the mechanics is one thing — deciding whether it's personally suitable for you requires an individual assessment of your own circumstances[^7].

[^1]: 01-master-terms.md | Demo Emerald Participation Plan 2026 is a fictional single-premium Irish domestic life-assurance investment policy issued by the fictional provider Team 25 Demo Life (fictional). It links a payment at the end of five years to the EURO STOXX 50 price index.
[^2]: 02-product-overview.md | You make one cash payment of at least EUR10,000. There are no top-ups or partial withdrawals. EUR100 pays the initial product charge and EUR100 pays the government levy. EUR9,800 is allocated.
[^3]: 01-master-terms.md | Positive index growth receives 120% participation, limited to 30% total growth on A... At the cap the payment is EUR12,740 before tax.
[^4]: 02-product-overview.md | If the final index change is zero or negative, the provider promises EUR9,800 at maturity. That is already EUR200 less than the original cash payment. The promise depends on the fictional provider being able to pay; failure could cause some or all of the money to be lost.
[^5]: 01-master-terms.md | After the cancellation period and before maturity, a full surrender may be requested... The surrender charge is 1% of V. Surrender payment before tax S = V × 99%.
[^6]: 04-worked-scenarios.md | The surrender charge is 1% × EUR8,500 = EUR85. Payment before tax is EUR8,500 − EUR85 = EUR8,415. This is below the EUR9,900 allowable premium, so the illustrative tax is EUR0.
[^7]: 02-product-overview.md | This demo assumes an ordinary Irish-resident adult who can leave the money for five years, has emergency savings elsewhere, understands provider failure and early-exit risk, and accepts capped growth.

## 2. If I invest €10,000, how much actually gets invested after charges?

Out of a €10,000 payment, only **€9,800 actually gets invested (allocated)** to your plan[^1].

The €200 difference is deducted upfront as two separate charges:

- €100 — initial product charge[^1]
- €100 — government levy[^1]

```bp-chart
{
  "type": "pie",
  "title": "Breakdown of €10,000 payment",
  "xKey": "category",
  "yKey": "amount",
  "xLabel": "Category",
  "yLabel": "Amount (EUR)",
  "description": "How a €10,000 payment is split between allocated investment and upfront charges.",
  "data": [
    { "category": "Amount allocated to plan", "amount": 9800 },
    { "category": "Initial product charge", "amount": 100 },
    { "category": "Government levy", "amount": 100 }
  ]
}
```

This €9,800 is the figure that all future growth calculations (and the "protected" maturity amount) are based on — so you start out €200 short of your original €10,000 before any market performance is even considered[^1][^2].

[^1]: 02-product-overview.md | You make one cash payment of at least EUR10,000. EUR100 pays the initial product charge and EUR100 pays the government levy. EUR9,800 is allocated.
[^2]: 01-master-terms.md | Positive index growth receives 120% participation, applied to the EUR9,800 allocated amount, limited to 30% total growth on Ap.

## 3. What does 120% participation mean? Show me a simple example.

**"120% participation" means you get 120% of the index's positive growth applied to your allocated amount — not a 120% return on your whole investment.** It's a multiplier on how much of the market's rise you benefit from[^1].

**How it works:**
- If the EURO STOXX 50 index rises over the five-year term, you don't just get that percentage rise — you get 1.2 times it[^1].
- This is applied to your €9,800 allocated amount (after charges), not your original €10,000 payment[^2].
- There's a cap: total growth can't exceed 30%, which is reached once the index rises by 25% or more (because 120% × 25% = 30%)[^1].

**Simple example:**

Say the index rises by 10% over the five years:

- Participation-adjusted growth = 10% × 120% = **12%**[^1]
- Applied to your €9,800: 12% of €9,800 = €1,176 in growth[^1]
- Your payout before tax = €9,800 + €1,176 = **€10,976**[^1]

```bp-chart
{
  "type": "bar",
  "title": "Example: 10% index rise with 120% participation",
  "xKey": "stage",
  "yKey": "amount",
  "xLabel": "Stage",
  "yLabel": "Amount (EUR)",
  "description": "How a 10% index rise becomes a 12% gain on the allocated amount under 120% participation.",
  "data": [
    { "stage": "Original payment", "amount": 10000 },
    { "stage": "Allocated amount", "amount": 9800 },
    { "stage": "Payout before tax (10% index rise)", "amount": 10976 }
  ]
}
```

**What happens if the index rises a lot more, say 40%?**
- Uncapped, 120% participation would suggest 48% growth — but the 30% cap kicks in[^1].
- So your payout is capped at €9,800 + 30% = **€12,740 before tax**, regardless of how much further the index climbs[^1].

**Key takeaway:** 120% participation boosts your share of positive growth by a fifth, but only up to a maximum 30% total return on the €9,800 allocated — it's not a guarantee of 120% profit, and it doesn't apply if the index falls[^1][^2].

[^1]: 01-master-terms.md | Positive index growth receives 120% participation, applied to the EUR9,800 allocated amount, limited to 30% total growth. A 10% index rise gives 12% growth (10% × 120%), producing EUR10,976 before tax. The cap is reached at a 25% index rise (120% × 25% = 30%), giving a maximum payment of EUR12,740 before tax.
[^2]: 02-product-overview.md | You make one cash payment of at least EUR10,000. EUR100 pays the initial product charge and EUR100 pays the government levy. EUR9,800 is allocated.

## 4. What could my €10,000 be worth after five years if the market falls 20%, stays flat, or rises 10%?

Here's what your €10,000 could be worth at maturity (five years) under these three scenarios, based on the plan's official worked examples[^1]:

| Market scenario | Applied growth on €9,800 | Payment before tax | Illustrative exit tax | Payment after tax |
|---|---:|---:|---:|---:|
| Falls 20% | 0% | €9,800.00 | €0.00 | **€9,800.00** |
| Flat (0%) | 0% | €9,800.00 | €0.00 | **€9,800.00** |
| Rises 10% | 12% | €10,976.00 | €408.88 | **€10,567.12** |

```bp-chart
{
  "type": "bar",
  "title": "€10,000 outcome after five years by market scenario",
  "xKey": "scenario",
  "yKey": "afterTax",
  "xLabel": "Market scenario",
  "yLabel": "Payment after tax (EUR)",
  "description": "Illustrative after-tax maturity payments for a €10,000 payment under three index scenarios.",
  "data": [
    { "scenario": "Falls 20%", "afterTax": 9800.00 },
    { "scenario": "Flat (0%)", "afterTax": 9800.00 },
    { "scenario": "Rises 10%", "afterTax": 10567.12 }
  ]
}
```

**Why these numbers:**

- **Falls 20%:** Since growth is only applied when the index rises, a negative index change results in 0% applied growth[^1]. The plan pays out the "protected" allocated amount of €9,800 — the same as if the market had done nothing at all[^1][^2]. This is already €200 less than your original €10,000, because of the upfront charges, and no tax applies since there's no gain[^1].

- **Flat (0%):** Identical outcome to a fall — you get €9,800 back, a €200 loss on your original payment, with no tax[^1].

- **Rises 10%:** The 120% participation rate turns a 10% index rise into 12% growth applied to your €9,800, giving €10,976 before tax[^1][^3]. After the illustrative 38% exit tax on the gain above the €9,900 tax-allowable premium (a tax of €408.88), you'd be left with **€10,567.12**[^1][^3].

**Important caveats:**
- These are hypothetical illustrations, not forecasts or guarantees — actual index index performance could differ entirely[^1].
- The €9,800 "protection" in the flat/falling scenarios is not a guarantee — it depends entirely on the provider being able to pay, and it is not backed by any state or deposit guarantee scheme[^2].
- If you needed to withdraw early (before the five-year maturity), none of these protections apply — you'd instead get a market-value quote minus a 1% surrender charge, which could be worth significantly less than €9,800[^4].

[^1]: 04-worked-scenarios.md | Five-year outcomes for EUR10,000 paid: −20% index change gives 0% growth, EUR9,800.00 before tax, EUR0.00 tax, EUR9,800.00 after tax. 0% gives the same. +10% gives 12% growth, EUR10,976.00 before tax, EUR408.88 tax, EUR10,567.12 after tax.
[^2]: 02-product-overview.md | If the final index change is zero or negative, the provider promises EUR9,800 at maturity. That is already EUR200 less than the original cash payment. The promise depends on the fictional provider being able to pay.
[^3]: 04-worked-scenarios.md | For a +10% final index change: 120% × 10% = 12% growth; EUR9,800 × 12% = EUR1,176 growth; EUR9,800 + EUR1,176 = EUR10,976 before tax; EUR1,076 × 38% = EUR408.88 illustrative tax; EUR10,976 − EUR408.88 = EUR10,567.12 after illustrative tax.
[^4]: 02-product-overview.md | After the cancellation period, full early surrender uses a quoted market value less a 1% surrender charge and any applicable tax. A hypothetical EUR8,500 quote produces EUR8,415 before tax.

## 5. Can I lose money even if I hold the product for the full five years?

Yes — even if you hold the Emerald plan for the full five years and reach maturity, you can still lose money. Here's how:

**1. You're already down €200 before any market movement**
- Only €9,800 of your €10,000 payment is actually allocated (after the €100 initial charge and €100 government levy)[^1]. Even in the best-case "protected" outcome, you get back €9,800 — not your full €10,000 — so a €200 loss is baked in from day one[^1][^2].

**2. The maturity "protection" is a promise, not a guarantee**
- If the index is flat or falls, the provider promises to pay the €9,800 allocated amount[^2]. But this is only a promise — it depends entirely on the fictional provider being able to pay[^2].
- There is no state or deposit guarantee behind this promise[^2]. If the provider were to fail or become insolvent, you could lose some or all of your money, including the supposedly "protected" €9,800[^2].

**3. Inflation erodes real value regardless of outcome**
- Even in scenarios where you get back exactly what was allocated, inflation over the five years reduces the real purchasing power of that money — so you could be worse off in real terms even without a nominal loss[^2].

**4. Growth is capped even in rising markets**
- This isn't a "loss" scenario, but it's worth noting: even if the index rises significantly, your upside is capped at 30% total growth on the €9,800, meaning you can never earn more than €12,740 before tax, however far the index climbs[^3].

**Summary of maturity outcomes:**

| Scenario | Payout before tax | Loss vs €10,000 original payment |
|---|---:|---:|
| Index falls or flat | €9,800 (if provider can pay) | €200 loss minimum, or full loss if provider fails |
| Index rises 10% | €10,976 | Gain (before tax) |
| Index rises 25%+ (capped) | €12,740 maximum | Gain (before tax) |

So the short answer is: yes, loss is possible even at full term, primarily through the built-in €200 charge deduction, and more seriously through provider default risk, since the "protected" amount is only as secure as the provider's ability to pay[^1][^2].

[^1]: 02-product-overview.md | You make one cash payment of at least EUR10,000. EUR100 pays the initial product charge and EUR100 pays the government levy. EUR9,800 is allocated.
[^2]: 02-product-overview.md | If the final index change is zero or negative, the provider promises EUR9,800 at maturity. That is already EUR200 less than the original cash payment. The promise depends on the fictional provider being able to pay; failure could cause some or all of the money to be lost. There is no state or deposit guarantee. Inflation can also erode the real value of the amount received.
[^3]: 01-master-terms.md | Positive index growth receives 120% participation, applied to the EUR9,800 allocated amount, limited to 30% total growth. The cap is reached at a 25% index rise, giving a maximum payment of EUR12,740 before tax.

## 6. What happens if I need my money back after two years?

If you need to access your money after two years (before the five-year maturity), you'd need to make a **full surrender** — and this could mean a real loss, since none of the maturity protections apply early.

**Key points:**

- **No partial withdrawals are allowed** — it's all or nothing. A full surrender ends the policy entirely[^1].
- **The €9,800 "protected" maturity promise does not apply.** Instead, the provider gives you a market-value quote (V) at the time of surrender, reflecting current conditions rather than any guaranteed floor[^1].
- **A 1% surrender charge is deducted** from that market-value quote[^1].
- **There is no minimum floor** — you could get back significantly less than your €9,800 allocated amount, and losses can exceed the initial €200 charge deduction[^1][^2].
- **Processing takes about five Irish banking business days** once you've accepted the quote and identity checks are complete[^1].

**Worked example (illustrative, year two):**

If the market-value quote at year two were €8,500[^2]:

- Surrender charge = 1% × €8,500 = €85[^2]
- Payment before tax = €8,500 − €85 = **€8,415**[^2]
- Since €8,415 is below the €9,900 tax-allowable premium threshold, illustrative tax = €0 in this example[^2]
- **Net result: €8,415 — a loss of €1,585 compared to your original €10,000 payment**[^2]

```bp-chart
{
  "type": "bar",
  "title": "Illustrative early surrender at year two vs original payment",
  "xKey": "stage",
  "yKey": "amount",
  "xLabel": "Stage",
  "yLabel": "Amount (EUR)",
  "description": "Example of a year-two surrender showing a loss against the original €10,000 payment.",
  "data": [
    { "stage": "Original payment", "amount": 10000 },
    { "stage": "Market value quote", "amount": 8500 },
    { "stage": "After 1% surrender charge", "amount": 8415 }
  ]
}
```

**Important:** this €8,500 quote is a hypothetical illustration, not a forecast — the actual market value at any point depends on real market conditions and could be higher or lower[^2].

**One exception:** if you're within the initial 30-calendar-day cooling-off period after receiving your policy pack, you can cancel and get your full original payment back with no charge — but this window is long gone after two years[^1].

[^1]: 01-master-terms.md | After the cancellation period and before maturity, a full surrender may be requested; there are no partial withdrawals. A market-value quote V is provided, the surrender charge is 1% of V, and surrender payment before tax S = V × 99%. Processing takes about five Irish banking business days once a quote is accepted and identity checks are complete.
[^2]: 04-worked-scenarios.md | Hypothetical year-two market value quote of EUR8,500: surrender charge = 1% × EUR8,500 = EUR85. Payment before tax is EUR8,500 − EUR85 = EUR8,415. This is below the EUR9,900 allowable premium, so the illustrative tax is EUR0.

## 7. What are the three most important risks? Keep it short.

Here are the three most important risks with the Emerald plan, kept brief:

1. **Provider default risk** — The maturity "protection" of €9,800 is only a promise, not a guarantee. It depends entirely on the fictional provider being able to pay, and there's no state or deposit guarantee behind it. Provider failure could mean losing some or all of your money[^1].

2. **Early exit risk** — Before maturity, there's no protected amount at all. Full surrender only gets you a market-value quote minus a 1% charge, with no floor — you could get back significantly less than you put in[^2].

3. **Capped upside, guaranteed shortfall** — Growth is capped at 30% however far the index rises, while even the best "protected" downside outcome still leaves you €200 short of your original €10,000 before tax or inflation are considered[^3].

[^1]: 02-product-overview.md | If the final index change is zero or negative, the provider promises EUR9,800 at maturity. The promise depends on the fictional provider being able to pay; failure could cause some or all of the money to be lost. There is no state or deposit guarantee.
[^2]: 01-master-terms.md | After the cancellation period and before maturity, a full surrender may be requested. A market-value quote V is provided, the surrender charge is 1% of V, and surrender payment before tax S = V × 99%.
[^3]: 01-master-terms.md | Positive index growth receives 120% participation, applied to the EUR9,800 allocated amount, limited to 30% total growth, reaching a maximum payment of EUR12,740 before tax.

## 8. Which demo products have terms of four years or less? Compare their charges and growth caps.

Based on the fictional demo product catalogue, four products have terms of four years or less[^1]:

| Product | Term | Initial charge | Premium levy | Total upfront charge | Allocated % of payment | Participation rate | Growth cap (total, over term) |
|---|---|---|---|---|---|---|---|
| **Demo Liffey Participation Plan 2026** | 3 years | 0.5% of P | 1% of P | 1.5% | 98.5% | 85% | 15% |
| **Demo Harbour Participation Plan 2026** | 3 years | 0% of P | 1% of P | 1% | 99% | 70% | 12% |
| **Demo Shannon Participation Plan 2026** | 4 years | 1% of P | 1% of P | 2% | 98% | 100% | 22% |
| **Demo Willow Participation Plan 2026** | 4 years | 0.5% of P | 1% of P | 1.5% | 98.5% | 95% | 20% |

*(P = total cash payment; all figures are fictional demo terms, not real products)*[^1]

```bp-chart
{
  "type": "bar",
  "title": "Growth caps for products with term of four years or less",
  "xKey": "product",
  "yKey": "cap",
  "xLabel": "Product",
  "yLabel": "Growth cap (%)",
  "description": "Total growth cap over the full term for each demo product with a term of four years or less.",
  "data": [
    { "product": "Liffey (3yr)", "cap": 15 },
    { "product": "Harbour (3yr)", "cap": 12 },
    { "product": "Shannon (4yr)", "cap": 22 },
    { "product": "Willow (4yr)", "cap": 20 }
  ]
}
```

**Key comparisons:**

- **Cheapest upfront:** Harbour has no initial product charge at all (just the 1% levy), leaving 99% allocated — the highest allocation rate of the group[^1].
- **Most expensive upfront:** Shannon has a 1% initial charge on top of the 1% levy, so only 98% gets allocated — matching Emerald's own 98% allocation rate, though over a shorter term[^1].
- **Highest participation & cap:** Shannon offers full 100% participation and the highest growth cap (22%) among this shorter-term group, despite having the highest charges[^1].
- **Lowest participation & cap:** Harbour, despite its low charges, only offers 70% participation and the lowest cap (12%) — the trade-off for its favourable allocation rate[^1].
- **Willow and Liffey sit in between:** both charge 0.5% initial (1.5% total upfront), but Willow has a notably higher participation rate (95% vs 85%) and higher cap (20% vs 15%) despite Liffey's shorter term[^1].

All four products share the same underlying structure as the Emerald plan: growth only applies to positive index movements, the cap is a total-term figure (not annual), maturity protection covers only the allocated amount and depends on the provider's ability to pay, and none carry a state or deposit guarantee[^1].

[^1]: 01-fictional-product-master-catalogue.md | Product 2 — Demo Liffey Participation Plan 2026: Term 3 years; Allocated 98.5% of P; Participation 85%; Growth cap 15% over 3 years; Initial charge 0.5% of P; levy 1% of P. Product 6 — Demo Harbour Participation Plan 2026: Term 3 years; Allocated 99% of P; Participation 70%; Growth cap 12% over 3 years; Initial charge 0% of P; levy 1% of P. Product 3 — Demo Shannon Participation Plan 2026: Term 4 years; Allocated 98% of P; Participation 100%; Growth cap 22% over 4 years; Initial charge 1% of P; levy 1% of P. Product 8 — Demo Willow Participation Plan 2026: Term 4 years; Allocated 98.5% of P; Participation 95%; Growth cap 20% over 4 years; Initial charge 0.5% of P; levy 1% of P.

## 9. Liffey and Harbour both last three years. What are the main differences?

Both Liffey and Harbour run for the same three-year term (maturing 11 September 2029)[^1][^2], but they differ meaningfully on charges and growth potential:

| Feature | **Liffey** | **Harbour** |
|---|---|---|
| Term | 3 years (matures 11 Sep 2029) | 3 years (matures 11 Sep 2029) |
| Initial product charge | 0.5% of P | **0% of P** |
| Premium levy | 1% of P | 1% of P |
| Total upfront charge | 1.5% | **1%** |
| Allocated amount (A) | 98.5% of P | **99% of P** |
| Participation rate | **85%** of positive growth | 70% of positive growth |
| Growth cap (total, over 3 years) | **15%** on A | 12% on A |

**Main differences:**

- **Charges:** Harbour is cheaper to enter — it has no initial product charge at all, only the 1% levy, so 99% of your payment is allocated versus 98.5% for Liffey[^1][^2].
- **Growth potential:** Liffey more than makes up for its slightly higher charge with a better participation rate (85% vs 70%) and a higher growth cap (15% vs 12%)[^1][^2]. So if the index rises, Liffey converts that rise into a bigger payout, up to a higher ceiling.
- **Everything else is identical:** Both share the same maturity protection structure (100% of the allocated amount only, conditional on the provider being able to pay — not a state or deposit guarantee), the same early-surrender terms (market-value quote minus a 1% surrender charge, no floor, no partial withdrawals), and the same general risks around provider failure, capped growth, and inflation[^1][^2].

**Bottom line:** Harbour suits someone who wants slightly lower upfront costs and a marginally larger "protected" allocation, while Liffey suits someone prioritising higher potential growth in exchange for a small extra upfront charge[^1][^2].

[^1]: 01-fictional-product-master-catalogue.md | Product 2 — Demo Liffey Participation Plan 2026: Term 3 years; maturity date 11 September 2029. Allocated amount 98.5% of P. Participation 85% of positive final index growth. Growth cap 15% total growth on A over the whole 3-year term. Initial product charge 0.5% of P. Premium levy 1% of P.
[^2]: 01-fictional-product-master-catalogue.md | Product 6 — Demo Harbour Participation Plan 2026: Term 3 years; maturity date 11 September 2029. Allocated amount 99% of total cash payment P. Participation 70% of positive final index growth. Growth cap 12% total growth on A over the whole 3-year term. Initial product charge 0% of P. Premium levy 1% of P.

## 10. Show me the source documents supporting that comparison.

There's a single primary source document backing that comparison, along with a supporting risk/cost register. Here are the exact passages:

**Primary source: `01-fictional-product-master-catalogue.md`**

For **Liffey**:
> "Product 2 — Demo Liffey Participation Plan 2026. Product version ID: DEMO-LIF-2026-01/v1.0. Status: Fictional demo. Term: 3 years; maturity date: 11 September 2029. Allocated amount: 98.5% of total cash payment P. Participation: 85% of positive final index growth, applied to the allocated amount A. Growth cap: 15% total growth on A over the whole 3-year term, not annually. Initial product charge: 0.5% of P. Premium levy: 1% of P, separately deducted. Maturity protection: 100% of A at maturity only, conditional on the fictional provider's ability to pay; not 100% of P and not a state or deposit guarantee."[^1]

For **Harbour**:
> "Product 6 — Demo Harbour Participation Plan 2026. Product version ID: DEMO-HAR-2026-01/v1.0. Status: Fictional demo. Term: 3 years; maturity date: 11 September 2029. Allocated amount: 99% of total cash payment P. Participation: 70% of positive final index growth, applied to the allocated amount A. Growth cap: 12% total growth on A over the whole 3-year term, not annually. Initial product charge: 0% of P. Premium levy: 1% of P, separately deducted. Maturity protection: 100% of A at maturity only, conditional on the fictional provider's ability to pay; not 100% of P and not a state or deposit guarantee."[^2]

**Shared common terms** (apply to both, found immediately preceding each product's specific entry in the same catalogue):
> "...only full surrender is permitted: payment before tax is the provider's market-value quote V less 1% of V. No maturity floor applies on surrender; losses may exceed the initial deductions. Quote acceptance and completed identity checks precede payment processing within five Irish banking days. No partial withdrawals."[^3]

**Supporting source: `02-fictional-product-risk-cost-register.md`** — this register corroborates the same charge/allocation structure and risk conditions (provider failure, early-loss, capped-growth, inflation) for each product line, though the specific Liffey and Harbour rows were not directly returned in this search; the master catalogue above is the authoritative source for both products' figures[^1][^2].

Both entries confirm the figures used in the earlier comparison: Liffey's 0.5% initial charge, 98.5% allocation, 85% participation and 15% cap; and Harbour's 0% initial charge, 99% allocation, 70% participation and 12% cap[^1][^2].

[^1]: 01-fictional-product-master-catalogue.md | Product 2 — Demo Liffey Participation Plan 2026: Term 3 years; maturity date 11 September 2029; Allocated amount 98.5% of P; Participation 85%; Growth cap 15% total growth on A over 3 years; Initial product charge 0.5% of P; Premium levy 1% of P.
[^2]: 01-fictional-product-master-catalogue.md | Product 6 — Demo Harbour Participation Plan 2026: Term 3 years; maturity date 11 September 2029; Allocated amount 99% of P; Participation 70%; Growth cap 12% total growth on A over 3 years; Initial product charge 0% of P; Premium levy 1% of P.
[^3]: 01-fictional-product-master-catalogue.md | after maturity, only full surrender is permitted: payment before tax is the provider's market-value quote V less 1% of V. No maturity floor applies on surrender; losses may exceed the initial deductions. Quote acceptance and completed identity checks precede payment processing within five Irish banking days. No partial withdrawals.

## 11. If the market rises 50%, do I get a 60% return on Emerald?

**No — you would not get a 60% return.** Even though 120% × 50% = 60% is the uncapped calculation, the Emerald plan has a hard cap that kicks in well before a 50% index rise[^1].

**Here's what actually happens:**

- The growth cap is **30% total** on your €9,800 allocated amount, and this cap is reached once the index rises by just **25%**[^1] (since 120% × 25% = 30%).
- Because a 50% index rise is far beyond that 25% threshold, your payout is capped at the maximum regardless of how much further the index climbs[^1].
- Maximum payout before tax = €9,800 + 30% = **€12,740**[^1] — this is the ceiling, whether the index rises 25%, 50%, or even 100%.

**So your actual return on the original €10,000:**
- €12,740 before tax on a €10,000 payment is a **27.4% return before tax** — not 60%[^1].
- After the illustrative exit tax on the gain, the after-tax figure would be lower still.

```bp-chart
{
  "type": "bar",
  "title": "Uncapped calculation vs actual capped payout (50% index rise)",
  "xKey": "scenario",
  "yKey": "amount",
  "xLabel": "Scenario",
  "yLabel": "Amount (EUR)",
  "description": "Comparison of what an uncapped 120% participation would suggest versus the actual capped maturity payment.",
  "data": [
    { "scenario": "Original payment", "amount": 10000 },
    { "scenario": "Uncapped 60% growth (not applied)", "amount": 15680 },
    { "scenario": "Actual capped payout before tax", "amount": 12740 }
  ]
}
```

**Key takeaway:** the 120% participation rate only matters for index rises up to 25% — beyond that, the 30% growth cap on the allocated amount governs your payout entirely, and any further market gains provide no additional benefit to you[^1].

[^1]: 01-master-terms.md | Positive index growth receives 120% participation, applied to the EUR9,800 allocated amount, limited to 30% total growth. The cap is reached at a 25% index rise (120% × 25% = 30%), giving a maximum payment of EUR12,740 before tax.

## 12. Harbour has no entry charge. Does that mean there are no deductions?

**No — Harbour still has deductions, just fewer than other products.** While Harbour has **0% initial product charge**, it still has a **1% premium levy** deducted separately[^1].

**Breakdown for Harbour:**

| Deduction | Amount |
|---|---|
| Initial product charge | 0% of payment |
| Premium levy | 1% of payment |
| **Total upfront deduction** | **1%** |
| **Amount allocated** | **99% of payment** |

So on a €10,000 payment, you'd still lose €100 to the levy, leaving **€9,900 allocated** — not the full €10,000[^1].

```bp-chart
{
  "type": "pie",
  "title": "Harbour: breakdown of €10,000 payment",
  "xKey": "category",
  "yKey": "amount",
  "xLabel": "Category",
  "yLabel": "Amount (EUR)",
  "description": "Even with no initial charge, Harbour still deducts a premium levy before allocation.",
  "data": [
    { "category": "Amount allocated", "amount": 9900 },
    { "category": "Premium levy", "amount": 100 }
  ]
}
```

**Why this matters:** the government levy is a separate, mandatory deduction that applies regardless of the provider's own charging structure — it isn't something the product provider can waive[^1]. Harbour simply doesn't add its own initial product charge on top, which is why it has the highest allocation rate (99%) among the products compared earlier, but it's not deduction-free[^1].

For comparison, Emerald deducts both a €100 initial charge and a €100 levy (2% total) on a €10,000 payment, leaving €9,800 allocated — so Harbour's 99% allocation is indeed better than Emerald's 98%, but both have levy deductions built in[^2].

[^1]: 01-fictional-product-master-catalogue.md | Product 6 — Demo Harbour Participation Plan 2026: Allocated amount 99% of total cash payment P. Initial product charge 0% of P. Premium levy 1% of P, separately deducted.
[^2]: 02-product-overview.md | You make one cash payment of at least EUR10,000. EUR100 pays the initial product charge and EUR100 pays the government levy. EUR9,800 is allocated.

## 13. Can you guarantee I’ll get my original €10,000 back?

**No — there is no guarantee that you'll get your original €10,000 back, under any circumstances.** This applies to Emerald and the other demo products discussed.

**Here's why:**

1. **You start €200 short from day one.** Only €9,800 of your €10,000 is actually allocated after the €100 initial charge and €100 levy are deducted[^1]. Even in the best "protected" maturity scenario, you cannot get back more than what was allocated plus any growth — the full €10,000 is never the promised floor[^1].

2. **The maturity "protection" is a conditional promise, not a guarantee.** If the index is flat or falls, the provider promises to pay the €9,800 allocated amount — but only if the provider is able to pay[^2]. This is not backed by any state or deposit guarantee scheme[^2]. Provider failure could mean losing some or all of your money, including that supposedly protected amount[^2].

3. **Early exit removes even that limited protection.** If you surrender before maturity, there's no floor at all — you'd receive a market-value quote minus a 1% surrender charge, which could be significantly less than €9,800[^3].

4. **Inflation further erodes real value.** Even if you receive back the full allocated amount, inflation over the term reduces its real purchasing power, meaning you could still be worse off in real terms[^2].

**The only scenario where you get your full €10,000 back** is if you cancel within the **30-calendar-day cooling-off period** after receiving your policy pack — that refund is at full value with no charge[^3]. Outside of that window, no full guarantee of your original €10,000 exists at any point, including at maturity.

[^1]: 02-product-overview.md | You make one cash payment of at least EUR10,000. EUR100 pays the initial product charge and EUR100 pays the government levy. EUR9,800 is allocated.
[^2]: 02-product-overview.md | If the final index change is zero or negative, the provider promises EUR9,800 at maturity. That is already EUR200 less than the original cash payment. The promise depends on the fictional provider being able to pay; failure could cause some or all of the money to be lost. There is no state or deposit guarantee. Inflation can also erode the real value of the amount received.
[^3]: 01-master-terms.md | A 30-calendar-day cooling-off period applies after receipt of the policy pack, allowing cancellation for a full refund with no charge. After the cancellation period and before maturity, a full surrender may be requested; there are no partial withdrawals. A market-value quote V is provided, the surrender charge is 1% of V, and surrender payment before tax S = V × 99%. No maturity floor applies on surrender.

## 14. Give me a five-year projection from the New Ireland Fund Information Sheet.

I've checked the New Ireland Fund Information Sheet (FIS) for iFunds 4 S9, and there's an important clarification needed: **it does not provide a five-year projection.** The FIS performance scenarios are only shown for two exit points: **1 year** and **7 years** (the fund's recommended holding period)[^1].

**What the FIS actually shows, based on a €10,000 example investment**[^1]:

| Scenario | If you exit after 1 year | If you exit after 7 years |
|---|---:|---:|
| Stress | €6,936 (−30.6% p.a.) | €6,687 (−5.6% p.a.) |
| Unfavourable | €8,604 (−14.0% p.a.) | €11,239 (+1.7% p.a.) |
| Moderate | €9,685 (−3.2% p.a.) | €12,076 (+2.7% p.a.) |
| Favourable | €11,328 (+13.3% p.a.) | €13,492 (+4.4% p.a.) |

These scenarios are illustrations based on the fund's worst, average, and best performance over the last 12 years — not guarantees, and markets could behave very differently in future[^1]. There is no minimum guaranteed return, and you could lose some or all of your investment[^1].

**If you want a five-year figure, the closest available data is past performance (not a projection)** from the separate iFunds 4 S9 factsheet, as at 10 September 2026[^2]:

- **5-year cumulative return:** 25.8%
- **5-year annualised return:** 4.7% per year

This is historical performance only and should not be treated as an indicator of future results[^2].

```bp-chart
{
  "type": "bar",
  "title": "iFunds 4 S9: FIS scenarios (1yr and 7yr) on €10,000",
  "xKey": "scenario",
  "yKey": "sevenYear",
  "xLabel": "Scenario",
  "yLabel": "Value after 7 years (EUR)",
  "description": "FIS performance scenarios for a €10,000 investment, shown at the 7-year recommended holding period since no 5-year scenario is provided.",
  "data": [
    { "scenario": "Stress", "sevenYear": 6687 },
    { "scenario": "Unfavourable", "sevenYear": 11239 },
    { "scenario": "Moderate", "sevenYear": 12076 },
    { "scenario": "Favourable", "sevenYear": 13492 }
  ]
}
```

If you'd like, I can look for a different New Ireland fund's FIS that uses a five-year recommended holding period, if one exists among the sources — otherwise this iFunds 4 S9 sheet only covers 1-year and 7-year scenarios.

[^1]: New-Ireland-iFunds4-S9-Smart-Funds-FIS.pdf | p. 2 | Recommended Holding Period 7 years. Example Investment €10,000. If you exit after: 1 year / 7 years. Stress: €6,936 / €6,687 (-30.6% / -5.6% average return each year). Unfavourable: €8,604 / €11,239 (-14.0% / 1.7%). Moderate: €9,685 / €12,076 (-3.2% / 2.7%). Favourable: €11,328 / €13,492 (13.3% / 4.4%). There is no minimum guaranteed return. You could lose some or all of your investment.
[^2]: New-Ireland-iFunds4-S9-Factsheet.pdf | p. 1 | Performance as at 10 September 2026: Cumulative 5Yrs 25.8%; Annualised 5Yrs (p.a.) 4.7%.

## 15. Which product should I buy?

I can't recommend a specific product for you to buy — that would be personal financial advice, and choosing the right product depends on your individual circumstances, risk tolerance, financial goals, and needs, which only a qualified financial adviser can properly assess with you[^1].

What I *can* do is help you compare the products' features side by side, so you're better equipped to have that conversation with an adviser. For example, I can help you weigh:

- **Term length** — how long you're comfortable locking money away (Emerald: 5 years; Liffey/Harbour: 3 years; Shannon/Willow: 4 years)
- **Charges vs allocation** — how much of your payment actually gets invested (ranges from 98% to 99% across the products discussed)
- **Participation rate and growth cap** — how much of any market rise you'd actually benefit from, and the ceiling on that
- **Early exit terms** — surrender charges and lack of guaranteed floors if you need money back before maturity
- **Risk factors** — provider default risk, inflation erosion, and capped upside apply across all these products

A few reminders that matter regardless of which product you're weighing:

- **All of these are fictional demo products** used for illustration — none are real products you can actually purchase[^2].
- **None carry a guarantee of your original capital back**, and none are backed by a state or deposit guarantee scheme[^1].
- Suitability depends on things like whether you can leave the money untouched for the full term, whether you have separate emergency savings, and whether you're comfortable with capped growth and provider-dependent protection[^1].

If it's helpful, I'm happy to build a more detailed side-by-side comparison table across all the products we've discussed (or the full catalogue), so you can see charges, caps, and terms together — but the final decision on which one is suitable for you should involve a regulated financial adviser reviewing your personal situation.

[^1]: 02-product-overview.md | This demo assumes an ordinary Irish-resident adult who can leave the money for five years, has emergency savings elsewhere, understands provider failure and early-exit risk, and accepts capped growth. The promise depends on the fictional provider being able to pay; there is no state or deposit guarantee.
[^2]: 01-master-terms.md | Demo Emerald Participation Plan 2026 is a fictional single-premium Irish domestic life-assurance investment policy issued by the fictional provider Team 25 Demo Life (fictional).

