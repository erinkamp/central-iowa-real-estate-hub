# Central Iowa Real Estate Hub — first working version

A lightweight, mobile-friendly news dashboard for sharing Central Iowa real estate research. Node.js 20+ required; no paid packages or API keys.

## Run locally

1. Install Node.js 20 or newer.
2. Open a terminal in this folder.
3. Run `npm start`.
4. Open http://localhost:3000.

## What updates automatically?

The Node server fetches RSS feeds, caches results for 20 minutes, and displays the latest available headlines with links to their original publishers. Feed failures are reported without fabricating stories. Google News search feeds aggregate external publishers and are not direct feeds from DMAAR or other organizations. The official source bookshelf links to DMAAR, Iowa REALTORS, Freddie Mac, Iowa Finance Authority, NAR, and Business Record; these links do not yet automatically import their data.

## Before publishing

- Replace the footer's logo placeholder with Erin's original approved logo; no logo file was provided in this build.
- Verify that each third-party feed's use and attribution complies with the publisher's terms, especially for public redistribution.
- Test feeds on the intended hosting provider; RSS endpoints can change or block requests.
- Host on a service supporting a persistent Node.js process or adapt to serverless functions. A static-only host cannot run the RSS backend.
- The learning notes use browser localStorage only: they do not sync between devices or accounts.
- Consider privacy policy and analytics choices before inviting visitors.

This is a working MVP, not a published production website. It contains no invented market statistics and no unverified live-data claims.
