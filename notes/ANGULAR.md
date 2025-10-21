[//]: # (Copyright © 2024 Perpetuator LLC)

# Development

To generate new components:

```shell
$ ng generate component chart
CREATE src/app/chart/chart.component.scss (0 bytes)
CREATE src/app/chart/chart.component.html (20 bytes)
CREATE src/app/chart/control.component.spec.ts (589 bytes)
CREATE src/app/chart/control.component.ts (231 bytes)
```

To generate new services:
```shell
$ ng generate service data
CREATE src/app/data.service.spec.ts (347 bytes)
CREATE src/app/data.service.ts (133 bytes)

```

# Angular Management

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.0.1.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Version Info

```
ng version
```

## WebStorm Testing

When I run tests in WebStorm I have to set the "Jest package" to the following path:

```
~/.nvm/versions/node/v20.13.1/bin/node \
  ~/projects/capital-copilot-fe/node_modules/@angular/cli/bin/ng.js \
  test \
  capital-copilot-fe \
  --karma-config ~/Applications/WebStorm.app/Contents/plugins/karma/js_reporter/karma-intellij/lib/intellij.conf.js \
  --source-map
```

If tests are failing with old erros, we may need to clear the Jest cache:

```
npx jest --clearCache
```

Or kill karma server processes:

```
pkill -f karma
```
 Can also go to Test view and kill the karma server from there.

