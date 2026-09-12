import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialTestResults, summarizeTestResults } from './testResults';

test('createInitialTestResults initializes every hardware module as untested', () => {
  const results = createInitialTestResults();

  assert.deepEqual(results.dashboard, { status: 'untested' });
  assert.equal(results.keyboard.status, 'untested');
  assert.equal(results.camera.status, 'untested');
  assert.equal(results.microphone.status, 'untested');
  assert.equal(results.speaker.status, 'untested');
  assert.equal(results.display.status, 'untested');
});

test('summarizeTestResults counts all module statuses correctly', () => {
  const results = {
    dashboard: { status: 'untested' },
    keyboard: { status: 'passed' },
    camera: { status: 'failed' },
    microphone: { status: 'testing' },
    speaker: { status: 'passed' },
    display: { status: 'untested' },
  };

  assert.deepEqual(summarizeTestResults(results as any), {
    total: 5,
    passed: 2,
    failed: 1,
    testing: 1,
    untested: 1,
  });
});
