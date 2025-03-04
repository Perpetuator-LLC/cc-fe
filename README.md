# Capital Copilot Front-End

To see the latest changes see: [CHANGELOG.md](CHANGELOG.md)

## Building

To get started, fork the repo on GitHub, then clone your copy.

Create the environment file and point it to the production back-end:
- src/environments/environment.ts

```html
export const environment = {
  production: false,
  API_URL: 'https://api.domain.io',
  STRIPE_PUBLIC_KEY: 'pk_test_111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111',
};
```

Once you have the repo, install deps:
```
yarn
```

Run the server with:
```
yarn start
```

To get started with Development see: [DEVELOPMENT.md](notes%2FDEVELOPMENT.md)
