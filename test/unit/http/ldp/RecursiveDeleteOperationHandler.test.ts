import { DataFactory as DF } from 'n3';
import type {
  Conditions,
  Operation,
  OperationHandler,
  Representation,
  ResourceIdentifier,
  ResourceStore,
  ResponseDescription,
} from '@solid/community-server';
import {
  BasicRepresentation,
  LDP,
  NotImplementedHttpError,
  PreconditionFailedHttpError,
} from '@solid/community-server';
import { RecursiveDeleteOperationHandler } from '../../../../src/http/ldp/RecursiveDeleteOperationHandler';
import { LWS_HTTP } from '../../../../src/util/Vocabularies';

function containerRepresentation(container: string, members: string[]): Representation {
  return new BasicRepresentation(
    members.map((member): any => DF.quad(DF.namedNode(container), LDP.terms.contains, DF.namedNode(member))),
    'internal/quads',
  );
}

describe('A RecursiveDeleteOperationHandler', (): void => {
  const target = { path: 'http://test.com/foo/' };
  const response: ResponseDescription = { statusCode: 205 };
  let conditions: jest.Mocked<Conditions>;
  let operation: Operation;
  let source: jest.Mocked<OperationHandler>;
  let store: jest.Mocked<ResourceStore>;
  let handler: RecursiveDeleteOperationHandler;

  beforeEach(async(): Promise<void> => {
    const body = new BasicRepresentation();
    body.metadata.set(LWS_HTTP.terms.depth, 'infinity');
    operation = { method: 'DELETE', target, preferences: {}, body };

    conditions = {
      matchesMetadata: jest.fn().mockReturnValue(true),
    };

    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(response),
    } as any;

    store = {
      hasResource: jest.fn().mockResolvedValue(true),
      getRepresentation: jest.fn(async(identifier: ResourceIdentifier): Promise<Representation> => {
        if (identifier.path === target.path) {
          return containerRepresentation(target.path, [ `${target.path}a`, `${target.path}b/` ]);
        }
        if (identifier.path === `${target.path}b/`) {
          return containerRepresentation(identifier.path, [ `${target.path}b/c` ]);
        }
        return containerRepresentation(identifier.path, []);
      }),
      deleteResource: jest.fn().mockResolvedValue(new Map()),
    } as any;

    handler = new RecursiveDeleteOperationHandler(source, store);
  });

  it('uses the source handler to determine if it can handle the input.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation })).resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenLastCalledWith({ operation });

    source.canHandle.mockRejectedValueOnce(new NotImplementedHttpError());
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotImplementedHttpError);
  });

  it('deletes all descendants before calling the source handler.', async(): Promise<void> => {
    await expect(handler.handle({ operation })).resolves.toBe(response);
    expect(store.deleteResource.mock.calls.map((call): string => call[0].path)).toEqual([
      `${target.path}a`,
      `${target.path}b/c`,
      `${target.path}b/`,
    ]);
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith({ operation: { ...operation, conditions: undefined }});
  });

  it('checks the conditions on the container first.', async(): Promise<void> => {
    operation.conditions = conditions;
    await expect(handler.handle({ operation })).resolves.toBe(response);
    expect(conditions.matchesMetadata).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenNthCalledWith(1, target, {});
    expect(store.deleteResource).toHaveBeenCalledTimes(3);
    expect(source.handle).toHaveBeenLastCalledWith({ operation: { ...operation, conditions: undefined }});
  });

  it('throws a 412 if the conditions do not match.', async(): Promise<void> => {
    operation.conditions = conditions;
    conditions.matchesMetadata.mockReturnValueOnce(false);
    await expect(handler.handle({ operation })).rejects.toThrow(PreconditionFailedHttpError);
    expect(store.deleteResource).not.toHaveBeenCalled();
    expect(source.handle).not.toHaveBeenCalled();
  });

  it('calls the source handler directly if the container does not exist.', async(): Promise<void> => {
    store.hasResource.mockResolvedValueOnce(false);
    await expect(handler.handle({ operation })).resolves.toBe(response);
    expect(store.deleteResource).not.toHaveBeenCalled();
    expect(source.handle).toHaveBeenLastCalledWith({ operation });
  });

  it('calls the source handler directly for other operations.', async(): Promise<void> => {
    operation.body = new BasicRepresentation();
    await expect(handler.handle({ operation })).resolves.toBe(response);
    expect(store.hasResource).not.toHaveBeenCalled();
    expect(store.deleteResource).not.toHaveBeenCalled();
    expect(source.handle).toHaveBeenLastCalledWith({ operation });
  });
});
