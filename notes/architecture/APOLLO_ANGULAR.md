[//]: # (Copyright © 2024-2026 Perpetuator LLC)

# Apollo GraphQL Integration

## Installation

```shell
ng add apollo-angular
```

## Schema Management

The schema is auto-generated from the backend. **Do not edit `src/app/schema.graphql` directly.**

To sync the schema from backend:
```shell
# On backend project
python manage.py export_schema --out=schema.graphql --format=sdl
# Then copy to frontend project
```

## GraphQL Design Principles

1. **All GraphQL operations return 200 status codes**
   - Success/failure indicated by `success` field in response
   - Non-200 errors indicate server/network issues

2. **Use Bearer token authentication**
   - Token from localStorage sent via `Authorization` header
   - See [AUTH_COOKIE_GUIDE.md](../integrations/AUTH_COOKIE_GUIDE.md)

3. **WebSocket for all operations**
   - Uses `graphql-ws` protocol
   - See [GRAPHQL_WEBSOCKET_GUIDE.md](../integrations/GRAPHQL_WEBSOCKET_GUIDE.md)

## TypeScript Types

Define TypeScript interfaces manually to match the schema:

```typescript
// Example: Match GraphQL types
interface WatchlistItem {
  symbol: string;
  displayName: string;
  marketCap: number;
}
```

**Note:** The backend uses Django (snake_case) but Graphene auto-converts to camelCase for GraphQL. Always use camelCase in frontend TypeScript.
