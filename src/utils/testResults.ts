import { TestId, TestStatus } from '../types';

export type ModuleTestResult = {
  status: TestStatus;
  details?: Record<string, string | number | boolean>;
};

export type TestResultsMap = Record<TestId, ModuleTestResult>;

export const HARDWARE_TEST_IDS: TestId[] = [
  'keyboard',
  'camera',
  'microphone',
  'speaker',
  'display',
];

export function createInitialTestResults(): TestResultsMap {
  return {
    dashboard: { status: 'untested' },
    keyboard: { status: 'untested' },
    camera: { status: 'untested' },
    microphone: { status: 'untested' },
    speaker: { status: 'untested' },
    display: { status: 'untested' },
  };
}

export function summarizeTestResults(results: TestResultsMap) {
  const total = HARDWARE_TEST_IDS.length;
  const passed = HARDWARE_TEST_IDS.filter((id) => results[id]?.status === 'passed').length;
  const failed = HARDWARE_TEST_IDS.filter((id) => results[id]?.status === 'failed').length;
  const testing = HARDWARE_TEST_IDS.filter((id) => results[id]?.status === 'testing').length;
  const untested = total - passed - failed - testing;

  return { total, passed, failed, testing, untested };
}

export function updateTestResult(
  previous: TestResultsMap,
  id: TestId,
  status: TestStatus,
  details?: Record<string, string | number | boolean>
): TestResultsMap {
  return {
    ...previous,
    [id]: {
      status,
      details: {
        ...(previous[id]?.details || {}),
        ...(details || {}),
        lastUpdated: new Date().toLocaleTimeString(),
      },
    },
  };
}
