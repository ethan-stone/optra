# Repo Layout

## Packages

- `web`: Next.js app for the dashboard.
- `api`: AWS Lambda function using https://hono.dev/.
- `bootstrap`: A helper libray to bootstrap the entire application for development.
- `core`: Shared core logic for the application.
- `lambdas`: AWS Lambda functions for background tasks such as rotating client secrets, rotating signing secrets, and invoicing customers.
- `docs`: Mintifly docs for the API reference and guides.
- `default-route`: Under the hood we use a cloudfront distributino to route requests to the correct origin. This is the origin that cloudfront routes to by default.

## TODO

- [ ] Nice homepage.
- [x] Viewable metrics for tokens issued per API.
- [x] Viewable metrics for tokens issued per client.
- [x] Set scopes API route.
- [ ] Onboarding flow when new sign up.
- [x] Internal scopes for `api`.
- [ ] Use internal scopes to authorize `api` requests.
- [ ] Setup better logging for `web`.
- [ ] Ability to client secrets for root clients.
- [x] Migrate to Supabase for auth instead of Clerk for less services.
- [ ] Billing management page.
- [ ] User management page.
- [ ] Have documentation, guides, API reference, and examples.
- [ ] Complete Stripe (or LemonSqueezy, need to check it out) integration with handling of payment fails.
- [ ] Setup some sort of incident tracker. Maybe incident.io.
- [ ] Be able to record usage of a client.
