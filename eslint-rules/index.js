// Copyright (c) 2026 Perpetuator LLC
//
// Local ESLint plugin — exports custom rules that live in this repo so we
// don't have to fork upstream packages. See ./README.md for rationale.

'use strict';

module.exports = {
  meta: {
    name: 'cc-local',
    version: '0.1.0',
  },
  rules: {
    'template-no-call-expression-strict': require('./template-no-call-expression-strict'),
  },
};
