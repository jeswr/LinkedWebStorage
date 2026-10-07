import { setGlobalLoggerFactory, WinstonLoggerFactory } from 'global-logger-factory';
import { getTestFolder, removeFolder } from '../integration/Config';

// Jest global setup requires a single function to be exported
export default async function(): Promise<void> {
// Set the main logger
  const level = process.env.LOGLEVEL ?? 'off';
  const loggerFactory = new WinstonLoggerFactory(level);
  setGlobalLoggerFactory(loggerFactory);

  // Clean up the test folder to prevent issues with remaining files from previous tests
  await removeFolder(getTestFolder(''));
}
