# ZENVRA v26 — System Guide

*Architecture · capability matrix · Pakistan Standard Time · API configuration · testing report · limitations · roadmap*

## 1. In one paragraph

ZENVRA v26 is a browser-only trading-intelligence desk (HTML/JS, no backend) on Binance Futures public data. It scans the whole USDT-M universe, produces signals from two independent sources (the preserved ICT/SMC rules engine and a **learned** gradient-boosted model that is allowed to trade only after out-of-sample validation), supervises itself with an AI-Robot state machine and health matrix, executes **paper** orders with institutional-style controls, and stores everything in IndexedDB with verified backup/restore. All user-facing time is Pakistan Standard Time. **Real-money execution does not exist in this build.** News, whale and on-chain intelligence are **not implemented** because they require a server (see §7, §10).

## 2. Architecture (modules and what they answer to in your spec)

The app is built from separate source files concatenated into one HTML by `integrate_v25.py`. Each module has its own tests.

| Spec engine | Module | Status |
|---|---|---|
| 1 AI Orchestration | `ZRobot` — operating-state machine (10 states), health matrix, activity log | Implemented |
| 2 Market Data Intelligence | legacy WS/REST layer + `ZMKT` (funding, OI, long/short, depth, liquidations) + `ZBrain` data engine | Implemented |
| 3 Full-Market Scanning | legacy two-phase scanner (top-50 lap, then the rest of the universe) + `ZMKT.hotList` priority queue | Implemented (see limits) |
| 4 Multi-Strategy Analysis | existing ICT/SMC engine (preserved, unmodified) + learned AI engine | Partial — no plug-in registry, no classical strategy families A–G |
| 5 AI / ML | `ZAI` — gradient-boosted trees written from scratch, purged walk-forward, calibration, explanations, shadow forward-test | Implemented (no LSTM/TCN/LightGBM/clustering) |
| 6 Sentiment · 7 Whale · 8 News | — | **Not implemented** (need a server) |
| 9 Liquidity & Order Book | `ZMKT`: top-20 depth imbalance/walls for 12 coins, live liquidation stream | Partial |
| 10 Signal Generation | rules engine (TP1–TP5, RR, leverage, expiry, fresh-signal gate) + AI signals (bracket, probability, EV, drivers) | Implemented |
| 11 Trade Execution | `ZOMS` paper venue | Paper only |
| 12 Risk Management | `ZOMS` pre-trade checks + kill switch, `ZBrain.risk`, portfolio VaR/stress | Implemented (see limits) |
| 13 Backtesting & Simulation | `ZBrain.lab` (replays the real engine, costs, walk-forward) | Implemented |
| 14 Self-Learning | `ZAI` retraining (user-triggered), `ZBrain` research & variant search (optional daily auto-run) | Partial — not continuous |
| 15 Journal & Analytics | journal, performance tabs, OMS trades/TCA/attribution | Implemented |
| 16 Monitoring & Recovery | `ZRobot` health, WS auto-reconnect, IndexedDB, backup/restore | Implemented (no backend supervision) |

## 3. Capability matrix

**A. Verified against LIVE exchange data (from your device screenshot):** persistent IndexedDB storage; 15 of 15 registered data sources responding with the expected schema; Binance kline history collection (93,034 candles stored across 11 coins).

**B. Implemented and verified only against mocked exchange traffic (needs your live confirmation):** all-symbol funding (`premiumIndex`), open-interest history, long/short ratio, order-book depth, CoinGecko BTC dominance, the `!forceOrder@arr` liquidation stream, WebSocket health, the robot's feed/API classification. Any endpoint that fails on your phone is shown in the Heatmap tab's **Source errors** card — nothing is hidden.

**C. Need API credentials (interfaces not built yet):** Whale Alert, CryptoQuant, Glassnode, CoinGlass, Arkham, any LLM/news-scoring API, Binance trading keys (testnet or live).

**D. Need a backend (cannot be done honestly in a browser):** news/announcement ingestion (CORS), sentiment/impact scoring, whale/on-chain feeds (secret keys), exchange-key custody and order reconciliation for testnet/live, 24/7 operation with the browser closed, server-side database.

**E. Simulation (always labelled as such):** paper fills (limits fill only when price trades *through* the limit; stops fill as market with slippage; no partial fills, no queue); backtests; the synthetic-market tests.

**F. Not implemented:** Strategy Registry and strategy families A–G (EMA 9/21/50/200, ADX, Supertrend, Ichimoku, Stochastic RSI, Donchian, Bollinger squeeze, divergences, stat-arb, z-score mean reversion…); formal market-regime classifier and per-regime strategy selection; LSTM/TCN, LightGBM, clustering; 1m/3m/5m/30m timeframes (the engines use 15m, 1H, 4H and daily bias); per-strategy risk settings; consecutive-loss protection; hard correlation-exposure cap (correlation/VaR are reported, not enforced); testnet and live execution; news/whale/sentiment; historical liquidation heatmap; automatic continuous retraining.

## 4. Pakistan Standard Time (PKT)

* Zone: `Asia/Karachi`, UTC+05:00, no daylight saving. Display uses `Intl.DateTimeFormat` with that zone, labelled **PKT**.
* Storage and calculations stay **UTC** (ISO strings). Only display is converted. Verified against the browser's timezone database on 400 random instants over 8 years, plus midnight and year rollovers.
* Converted: every timestamp shown through the app's formatter (27 display sites), the ticker clock, the kill-zone timeline (zones are defined in UTC internally and drawn shifted +5 h: Asia 05:00–12:00, London 12:00–17:00, NY AM/Silver Bullet 17:00–20:00, NY PM 21:30–02:00), share/export text, my new tabs.
* Deliberately still UTC: the *calculation boundary* of "today" for daily-loss limits and the monthly performance buckets (crypto's trading day closes at 00:00 UTC = 05:00 PKT; this is labelled in the UI).

## 5. AI engine — how it earns the right to trade

Features (38, causal) → triple-barrier labels → gradient-boosted trees → Platt calibration → **purged anchored walk-forward** (every reported number is out-of-sample, after fees, slippage and funding). A model becomes the live "champion" only if **all** hold: positive out-of-sample expectancy with ≥60% of folds positive, profit factor above the judge threshold, **≥100 trades, t-statistic ≥ 2.5, and z ≥ 2.33 against random-direction trading on the same bars.** Otherwise it is stored but never issues signals. Live signals are additionally forward-tested in "shadow".
Measured: a planted real edge validates (z≈12); across **30 trendless random-walk markets with zero costs (12,561 trades) none was falsely validated** — that bounds the false-positive rate below roughly 10% at 95% confidence; it is not a guarantee. **Nothing has yet been shown about its performance on real market data** — that depends on running *Train & validate* on your history.

## 6. Risk & execution

Pre-trade checks on every order: price band, size cap, 24h-volume cap, margin, gross/per-symbol exposure, duplicate guard, daily-loss lock, exchange tick/step/min-notional rounding, reduce-only logic, Brain risk suspension for AI orders. Kill switch cancels everything, flattens paper positions and halts. Order log is hash-chained (integrity check, not tamper-proof against an adversary with local access). Portfolio risk: historical-simulation VaR/ES on stored 15m bars (parametric fallback is labelled), BTC-beta stress tests, correlation matrix, liquidation distance. Leverage is never raised by confidence; AI sizing uses fractional Kelly capped at 1% equity. Live trading: **locked by design** — the safe route is a server-side connector with testnet first, idempotent orders and exchange-state reconciliation before any retry (§10).

## 7. Installation and API configuration

* **PWA:** upload the contents of the PWA zip to any HTTPS static host (Netlify Drop, GitHub Pages, Cloudflare Pages), open the URL, *Install app*. A local file / `content://` link works as a normal page but cannot install or work offline.
* **No keys are needed** for anything currently built (all Binance public endpoints + CoinGecko global).
* **Future feeds — configuration rule:** every key lives on a server (e.g. a Cloudflare Worker secret), never in this app. The app talks to your edge URL only. Required per feed: Whale Alert (API key), CryptoQuant / Glassnode (paid plans), CoinGlass (API key), Arkham (access), news (public RSS needs only the edge service), Binance testnet/live (API key + secret with trade-only, no-withdrawal permission, IP-restricted).
* **Moving between addresses:** browser storage belongs to the web address. Use *AI Robot → Export full backup* before moving, then *Import backup* at the new address (integrity-checked before anything is replaced).

## 8. Testing report

| Suite | Result |
|---|---|
| AI engine (features, labels, trees, calibration, bracket simulation, walk-forward, null-test gate, train/serve parity, shadow, registry) | 59 / 59 |
| Order engine (fills, stops, brackets/OCO, accounting, liquidation, funding, every pre-trade check, kill switch, audit chain, persistence, TCA, portfolio risk) | 129 / 129 |
| Phase 2 (PKT, robot states and health, market intelligence maths and liquidation parsing, backup integrity and tamper detection) | 87 / 87 |
| Headless-browser smoke (16 tabs, 0 errors, PWA service worker, offline reload) | pass |
| Headless-browser phase 2 (mocked live WebSockets: robot transitions SCANNING→EXECUTING→RISK LOCKDOWN, heatmap data, PKT labels, in-browser backup round-trip) | pass |

Bugs found and fixed by these tests during development include: trades force-closed when data merely ended; an optimistic stop-limit fill; a validation gate that let noise through; liquidation events counting unfilled size; a broken kill-switch glyph on Android. **Not tested:** any of §3-B against live endpoints; real-device performance of AI training beyond the browser measurement (3–4 s for 3 coins on a desktop engine); iOS.

## 9. Known limitations

Scanner coverage is the full universe, but deep market metrics (OI, long/short, depth) cover only the top 30 / 12 coins by volume because of rate limits. Liquidation data is a live sample, not history. Sector tags are a hand-kept static map. Sector, dominance and movers views are informational. Backtests use one ~30–100-day regime and survivorship-biased symbols. The app only runs while the browser/PWA is open and foregrounded; "24/7" needs a server. No claim is made that any signal is profitable.

## 10. Roadmap (needs your decisions and a small amount of hosting)

1. **Edge service** (free Cloudflare Worker or small VPS): RSS/announcement fetch + de-duplication + verified-source tagging, a transparent keyword/lexicon impact score (clearly labelled as heuristic unless an LLM is added), Whale Alert proxy with the key kept server-side, economic-calendar feed.
2. **Strategy registry + regime engine:** wrap the ICT engine, add classical families as testable modules, regime classification, per-regime performance evaluation through the existing walk-forward lab.
3. **Testnet execution:** server-side key custody, idempotent orders, reconciliation, then explicit authorisation gates before any live use.
4. **Continuous learning:** scheduled retraining with champion/challenger promotion and rollback (model versioning already exists).
