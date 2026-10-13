# Sprint 5 — Frontend VNPay sandbox setup

Use the `integration/sprint5` branch in both repositories. This setup changes no
wallet, pricing, payment-confirmation or manual-learning business rules.

## Start locally

Run from `D:\ai-frontend`:

```powershell
if (-not (Test-Path -LiteralPath .env.local)) {
    Copy-Item -LiteralPath .env.sandbox.example -Destination .env.local
}
npm ci
npm run dev:sandbox
```

If `.env.local` already exists, merge the example manually rather than overwrite it.
Next.js automatically loads `.env.local`; a file named `.env.sandbox` is not automatically loaded.
Set `BACKEND_URL=http://localhost:8080` and restart Next.js after changing it.
`dev:sandbox` fixes the browser host/port to `http://localhost:3000`, matching the
backend Return URL. If port 3000 is occupied, stop the old dev server yourself.
No new package dependency is required.

Use email/password sign-in, or retain your existing Google client ID if configured.
Never place a VNPay signing secret or merchant credentials in frontend files, even without
the NEXT_PUBLIC prefix. The frontend does not generate signatures or grant credits.

## Backend and callback setup

In `D:\ai-planning-backend`, follow `docs/vnpay-sandbox.md`:

1. Copy the backend `.env.sandbox.example` to its ignored `.env.sandbox` file if absent.
2. Fill SANDBOX merchant credentials there and set `BILLING_PAYMENTS_ENABLED=true`.
3. Start PostgreSQL/Redis and the backend with
   `.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local,sandbox'`.
4. Start ngrok or Cloudflare Tunnel against backend port 8080.
5. Register the full URL `https://<backend-tunnel-host>/api/v1/billing/vnpay-ipn` with VNPay.

Do not replace BACKEND_URL with the tunnel URL for this same-computer setup.
Keep `VNPAY_RETURN_URL=http://localhost:3000/billing/checkout/result` in the backend.
The IPN route is public for signed gateway callbacks, not an authenticated browser page.
A remote tester needs a separate reachable frontend URL and reviewed cookie/CORS settings.

## Prepare and test

- As ADMIN, use `/admin?tab=billing` to create and activate a Credit package.
- As a separate USER, open `/billing`; ADMIN cannot purchase through USER endpoints.
- In DevTools, verify `/api/v1/billing/configuration` reports `data.paymentsEnabled=true`.
- Record the initial wallet balance after initialization, including any one-time welcome bonus.
- Buy a package with a documented VNPay sandbox test payment method, not real banking credentials.
- The browser return screen waits for the backend order status. A return-query response code
  alone is not payment confirmation and never grants credits.
- On verified PAID, the available balance increases by the snapshotted package total;
  reserved credits remain unchanged and history shows one TOP_UP ledger entry.
- For cancellation/failure, no top-up is granted. Repeated IPN delivery cannot grant twice.
- For delayed IPN or polling timeout, recheck the original order; do not immediately buy again.
- Network retry of the same uncertain purchase must reuse its existing idempotency key.

Use backend automated tests for bad signatures, amount mismatch, duplicate callbacks and
concurrency. Never change the database to force PAID or share signed callback URLs in chat.
Stop the tunnel and disable backend purchases after the test session.

## Verify frontend

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Passing local tests is not evidence of a live sandbox transaction. The merchant credentials,
public callback registration and complete checkout/IPN demonstration still need to be tested.
