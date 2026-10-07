import type { ErrorHandler, ErrorHandlerArgs, ResponseDescription } from '@solid/community-server';
import { NotFoundHttpError } from '@solid/community-server';
import { FallbackErrorHandler } from '../../../../../src/http/output/error/FallbackErrorHandler';

describe('A FallbackErrorHandler', (): void => {
  const input: ErrorHandlerArgs = { error: new NotFoundHttpError(), request: {} as any };
  const sourceResult: ResponseDescription = { statusCode: 404 };
  const fallbackResult: ResponseDescription = { statusCode: 500 };
  let source: jest.Mocked<ErrorHandler>;
  let fallback: jest.Mocked<ErrorHandler>;
  let handler: FallbackErrorHandler;

  beforeEach(async(): Promise<void> => {
    source = {
      handleSafe: jest.fn().mockResolvedValue(sourceResult),
    } as any;
    fallback = {
      handleSafe: jest.fn().mockResolvedValue(fallbackResult),
    } as any;
    handler = new FallbackErrorHandler(source, fallback);
  });

  it('returns the result of the source handler.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toBe(sourceResult);
    expect(source.handleSafe).toHaveBeenLastCalledWith(input);
    expect(fallback.handleSafe).not.toHaveBeenCalled();
  });

  it('uses the fallback handler if the source handler fails.', async(): Promise<void> => {
    source.handleSafe.mockRejectedValueOnce(new Error('bad data'));
    await expect(handler.handle(input)).resolves.toBe(fallbackResult);
    expect(fallback.handleSafe).toHaveBeenLastCalledWith(input);
  });

  it('throws the error of the fallback handler if both fail.', async(): Promise<void> => {
    source.handleSafe.mockRejectedValueOnce(new Error('bad data'));
    fallback.handleSafe.mockRejectedValueOnce(new Error('fallback failed'));
    await expect(handler.handle(input)).rejects.toThrow('fallback failed');
  });
});
