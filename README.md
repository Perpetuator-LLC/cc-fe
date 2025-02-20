# Capital Copilot Front-End

To see the latest changes see: [CHANGELOG.md](CHANGELOG.md)

## Building

To get started, fork the repo on GitHub, then clone your copy.

Create the environment file and point it to the production back-end:
- src/environments/environment.ts

```html
export const environment = {
  production: false,
  API_URL: 'https://api.capitalcopilot.io',
  STRIPE_PUBLIC_KEY: 'pk_test_51Oc1SLKzFZo1wXZq0chhN5lPNMKMAdeCo5ettmYAWS04whr4UIqFa1rIr7qNlGyvi7mFx7IrpQQFY0D4AAYSV6CW00brKyegzi',
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
