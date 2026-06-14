// Copyright (c) 2026 Perpetuator LLC
import { EnrichedJob, JobChainGroup } from '../jobs-list.types';
import { JobsListChainComponent } from './jobs-list-chain.component';

describe('JobsListChainComponent', () => {
  let component: JobsListChainComponent;

  beforeEach(() => {
    component = new JobsListChainComponent();
  });

  it('emits the chain id on toggle, but only when one exists', () => {
    const toggled: string[] = [];
    component.toggleExpanded.subscribe((id) => toggled.push(id));

    component.item = { chainId: 'chain-1', expanded: false } as JobChainGroup;
    component.onToggle();
    expect(toggled).toEqual(['chain-1']);

    component.item = { chainId: null, expanded: false } as unknown as JobChainGroup;
    component.onToggle();
    expect(toggled).toEqual(['chain-1']);
  });

  it('forwards symbol clicks', () => {
    const clicked: EnrichedJob[] = [];
    component.symbolClick.subscribe((job) => clicked.push(job));
    const job = { uuid: 'job-1' } as EnrichedJob;
    component.onSymbolClick(job);
    expect(clicked).toEqual([job]);
  });

  it('swaps the expand icon with state', () => {
    component.item = { expanded: false } as JobChainGroup;
    expect(component.expandIcon).toBe('expand_more');
    component.item = { expanded: true } as JobChainGroup;
    expect(component.expandIcon).toBe('expand_less');
  });
});
