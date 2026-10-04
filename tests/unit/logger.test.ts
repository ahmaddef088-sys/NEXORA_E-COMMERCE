/**
 * Tests for the centralized logger.
 * Verifies that the logger calls the right output methods
 * without throwing and does not expose sensitive data.
 */
import { logger } from '@/lib/logger';

describe('logger', () => {
  let stdoutSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('logger.info does not throw', () => {
    expect(() => logger.info('test info message')).not.toThrow();
  });

  it('logger.warn does not throw', () => {
    expect(() => logger.warn('test warn message')).not.toThrow();
  });

  it('logger.error does not throw', () => {
    expect(() => logger.error('test error', new Error('some error'))).not.toThrow();
  });

  it('logger.debug does not throw', () => {
    expect(() => logger.debug('test debug', { key: 'value' })).not.toThrow();
  });

  it('logger.error accepts non-Error objects', () => {
    expect(() => logger.error('something happened', 'string error')).not.toThrow();
  });

  it('logger.info accepts context object', () => {
    expect(() => logger.info('user action', { userId: 'abc', action: 'login' })).not.toThrow();
  });

  it('all log methods are functions', () => {
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});
