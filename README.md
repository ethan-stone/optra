# Architecture

## Services

- Cloudflare Workers
  - Used for the core API to management APIs, clients, scopes, etc.
- Cloudflare R2
  - Used for storing JSON Web Key sets for RSA256 APIs.
- Clerk
  - Used for managing dashboard users and organizations.
- Supabase
  - Core data store for the application.
- AWS SQS
  - Used for queuing async tasks.
- AWS Lambda
  - Triggered by SQS to process background tasks. Used for rotating client secrets, rotating signing secrets, and invoicing customers.
  - Also have a lambda to that is a CRON job to loop through all customers and send a messages to the queue to invoice them.
