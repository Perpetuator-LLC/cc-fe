// Copyright (c) 2026 Perpetuator LLC
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { CanComponentDeactivate, canDeactivateGuard } from './can-deactivate.guard';

describe('canDeactivateGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  function run(component: CanComponentDeactivate): boolean {
    return canDeactivateGuard(component, route, state, state) as boolean;
  }

  it('delegates to the component canDeactivate method', () => {
    expect(run({ canDeactivate: () => true })).toBeTrue();
    expect(run({ canDeactivate: () => false })).toBeFalse();
  });

  it('allows deactivation when the component has no canDeactivate', () => {
    expect(run({} as CanComponentDeactivate)).toBeTrue();
  });
});
