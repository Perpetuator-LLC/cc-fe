// Copyright (c) 2026 Perpetuator LLC
import { parseScheduleArgs } from './schedule';

describe('parseScheduleArgs', () => {
  it('returns an empty object for null/undefined/empty input', () => {
    expect(parseScheduleArgs(null)).toEqual({});
    expect(parseScheduleArgs(undefined)).toEqual({});
    expect(parseScheduleArgs('')).toEqual({});
  });

  it('parses a JSON string and camelCases snake_case keys', () => {
    expect(parseScheduleArgs('{"podcast_uuid": "p-1", "episode_name": "Ep"}')).toEqual({
      podcastUuid: 'p-1',
      episodeName: 'Ep',
    });
  });

  it('accepts an already-parsed object', () => {
    expect(parseScheduleArgs({ pulse_config_uuid: 'pc-1' })).toEqual({ pulseConfigUuid: 'pc-1' });
  });

  it('camelCases nested objects recursively', () => {
    // The declared return type is flat, but nested values pass through at runtime.
    const result: unknown = parseScheduleArgs({ outer_key: { inner_key: 'v' } });
    expect(result).toEqual({ outerKey: { innerKey: 'v' } });
  });

  it('leaves arrays untouched (no recursion into array values)', () => {
    const result: unknown = parseScheduleArgs({ some_list: ['a_b', 'c_d'] });
    expect(result).toEqual({ someList: ['a_b', 'c_d'] });
  });

  it('returns an empty object and warns on invalid JSON', () => {
    const warn = spyOn(console, 'warn');
    expect(parseScheduleArgs('{not json')).toEqual({});
    expect(warn).toHaveBeenCalled();
  });

  it('returns an empty object for non-string non-object input', () => {
    expect(parseScheduleArgs(42)).toEqual({});
    expect(parseScheduleArgs(true)).toEqual({});
  });
});
