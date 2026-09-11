# Investment chat acceptance review

Test date: 11 September 2026. Live Claude Sonnet 5 through `https://staging.boi.buildprompt.app`. Local app: http://127.0.0.1:5174; API: http://127.0.0.1:3002.

The original configuration selected no collections. The initial browser question could not identify Emerald. The app now sends a fixed server-side selection through BuildPrompt's existing `sourceSelection` API: collections 01 (Emerald master terms), 02 (disclosures), 03 (reviewed New Ireland public documents), 07 (fictional range master), and 08 (risk/cost register), all under Team 25. Health confirms 14 documents in five collections. There is no user dropdown and shared staging defaults were not changed.

All questions were submitted verbatim, in the requested order, with prior answers retained. [The transcript](investment-chat-transcript.md) records the answers. Results describe this run, not a guarantee of future model behavior. Source selection is fixed and built into the adapter for BOI staging; no extra environment setting is required. The answer-quality issues below remain open. Overall: 10 pass (some with wording/length caveats), 2 partial, 3 fail.

| # | Question | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Explain Emerald to a beginner | Pass, verbose | Correct fictional identity, five-year term, allocation, participation, cap and conditional protection. Much longer than an ideal beginner answer. |
| 2 | €10,000 after charges | Pass | €100 product charge plus €100 levy leaves €9,800. |
| 3 | Explain 120% participation | Pass | 10% positive index growth gives 12% on €9,800 and €10,976 before tax; includes the 30% cap. |
| 4 | Five-year −20%, flat, +10% scenarios | Pass | Before tax: €9,800 / €9,800 / €10,976. Illustrative after tax: €9,800 / €9,800 / €10,567.12. Matches the worked scenarios; notes hypothetical outcomes and provider conditions. |
| 5 | Can I lose money at maturity? | Pass with wording caveat | Explains the €200 deductions, provider failure and inflation. “Best-case protected outcome” is awkward because growth can produce a higher payment. |
| 6 | Exit after two years | Pass | Full surrender at market quote less 1%, no maturity floor. €8,500 quote → €8,415 is explicitly hypothetical. |
| 7 | Three short risks | Partial | Names provider default, early exit and capped growth/deductions, but “guaranteed shortfall” is misleading without saying this is the flat/falling maturity case. The citations make the answer long. |
| 8 | Products of four years or less | Pass | Correctly identifies Liffey, Harbour, Shannon and Willow; all charges, levies, allocations, participation rates and caps match the catalogue. |
| 9 | Liffey versus Harbour | Fail | Numbers are correct, but it claims Liffey pays more whenever the index rises. A small positive rise can still leave Harbour ahead. Also uses unsupported “suits someone” wording. |
| 10 | Show comparison source documents | Fail | Names and quotes the correct catalogue but supplies no document links. A citation incorrectly says “after maturity” where the source says after cancellation and before maturity. |
| 11 | 50% market rise means 60% Emerald return? | Pass | Rejects 60%; explains 30% cap on allocation, €12,740 maximum before tax and 27.4% on original cash paid. |
| 12 | No Harbour entry charge means no deductions? | Partial | Correctly identifies the separate 1% levy and €9,900 allocation, but adds an unsupported general claim that the provider cannot waive/absorb it. |
| 13 | Guarantee original €10,000? | Fail | Correctly denies an unconditional guarantee, but applies Emerald's €9,800 figure across products and says cancellation is the only way to get the full €10,000 back. Sufficient growth can also return €10,000 or more. |
| 14 | Five-year New Ireland FIS projection | Pass | Explicitly states no five-year scenario exists and distinguishes the actual 1-year/7-year scenarios from historical performance. |
| 15 | Which product should I buy? | Pass on retry | Declines to select a product, explains comparison factors and missing personal circumstances, and notes that the demo products are fictional. First attempt hit a staging rate limit. |

## Independent source checks

Downloaded the actual staging master terms, worked scenarios, master catalogue, risk/cost register and New Ireland iFunds 4 S9 Smart Funds FIS. These are the source of the expected values, not the generated answers.

- Emerald master sections 3–5: 1% charge + 1% levy; 98% allocation; 120% positive participation capped at 30% on allocation. Protection is conditional and only applies at maturity.
- Master section 7 and worked scenarios: early surrender is 99% of a market quote. The quote cannot be inferred from an index move alone.
- Worked scenarios: the +10% case uses a €9,900 illustrative tax basis, €408.88 tax and €10,567.12 after tax. No double deduction of entry costs.
- Catalogue: Liffey (3 years, 0.5% entry, 1% levy, 85% participation, 15% cap); Harbour (3, 0%, 1%, 70%, 12%); Shannon (4, 1%, 1%, 100%, 22%); Willow (4, 0.5%, 1%, 95%, 20%). Caps cover the entire term.
- Counterexample to question 9: at a hypothetical 1% index rise and €10,000 cash paid, Liffey pays €9,933.725 before rounding and tax; Harbour pays €9,969. Harbour is higher despite the positive market return. Neither cap applies.
- FIS produced 22 December 2025: seven-year recommended holding period, scenario table only at one and seven years; no five-year projection.

## UI findings

Follow-up: the citation display issue is now fixed. Numbered badges open source cards with excerpts, optional page labels and links to uniquely matched selected documents. Saved chats also use the new renderer. Markdown tables now render correctly. BuildPrompt chart blocks now render as interactive charts with exact-value tables, including in saved answers. This UI fix does not validate or correct model-written quotations, so the misquote in question 10 remains a separate answer-quality issue.

Original observations from the acceptance run:

The browser shows “14 documents in 5 selected collections.” Saved answers reopen. However, Markdown tables and footnotes are not rendered as tables/footnotes, and `bp-chart` JSON appears as raw code. Source citations are filenames and excerpts rather than links that open the documents. These are existing rendering/integration gaps exposed by this test.

## Validation

- Scoped Biome check-and-fix: changed TypeScript files passed.
- Dead-code check: passed.
- Server and web component typechecks: passed; no root/full-project typecheck.
- Backend tests: 7 passed, including explicit source selection and missing-collection reporting.
- API integration tests: 5 passed, using temporary conversations and canned streams, not live model correctness assertions.
- Live acceptance checks above were reviewed separately against the documents.
