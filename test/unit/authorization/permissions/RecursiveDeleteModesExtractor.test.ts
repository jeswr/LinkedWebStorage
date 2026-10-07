import { PERMISSIONS } from '@solidlab/policy-engine';
import type { AccessMap, ModesExtractor, Operation, ResourceSet, ResourceStore } from '@solid/community-server';
import { BasicRepresentation, IdentifierSetMultiMap } from '@solid/community-server';
import { RecursiveDeleteModesExtractor } from '../../../../src/authorization/permissions/RecursiveDeleteModesExtractor';
import * as ContainerUtil from '../../../../src/storage/ContainerUtil';
import { LWS_HTTP } from '../../../../src/util/Vocabularies';

describe('A RecursiveDeleteModesExtractor', (): void => {
  const target = { path: 'http://example.com/container/' };
  const descendants = [{ path: 'http://example.com/container/a' }, { path: 'http://example.com/container/sub/' }];
  let operation: Operation;
  let sourceMap: AccessMap;
  let source: jest.Mocked<ModesExtractor>;
  let resourceSet: jest.Mocked<ResourceSet>;
  const store: ResourceStore = {} as any;
  let findDescendants: jest.SpyInstance;
  let extractor: RecursiveDeleteModesExtractor;

  beforeEach(async(): Promise<void> => {
    operation = {
      target,
      method: 'DELETE',
      preferences: {},
      body: new BasicRepresentation(),
    };
    operation.body.metadata.set(LWS_HTTP.terms.depth, 'infinity');

    sourceMap = new IdentifierSetMultiMap<string>([[ target, PERMISSIONS.Delete ]]);
    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(sourceMap),
    } as any;

    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };

    findDescendants = jest.spyOn(ContainerUtil, 'findDescendants').mockResolvedValue(descendants);

    extractor = new RecursiveDeleteModesExtractor(source, resourceSet, store);
  });

  afterEach((): void => {
    findDescendants.mockRestore();
  });

  it('supports input its source supports.', async(): Promise<void> => {
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();

    source.canHandle.mockRejectedValue(new Error('bad data'));
    await expect(extractor.canHandle(operation)).rejects.toThrow('bad data');
  });

  it('adds delete modes on all descendants of a recursive delete.', async(): Promise<void> => {
    const result = await extractor.handle(operation);
    expect([ ...result.keys() ]).toHaveLength(3);
    expect(result.get(descendants[0])).toEqual(new Set([ PERMISSIONS.Delete ]));
    expect(result.get(descendants[1])).toEqual(new Set([ PERMISSIONS.Delete ]));
    expect(findDescendants).toHaveBeenLastCalledWith(store, target);
  });

  it('does not change the results if the delete is not recursive.', async(): Promise<void> => {
    operation.body.metadata.removeAll(LWS_HTTP.terms.depth);
    const result = await extractor.handle(operation);
    expect([ ...result.keys() ]).toHaveLength(1);
    expect(findDescendants).not.toHaveBeenCalled();
  });

  it('does not change the results if the target does not exist.', async(): Promise<void> => {
    resourceSet.hasResource.mockResolvedValue(false);
    const result = await extractor.handle(operation);
    expect([ ...result.keys() ]).toHaveLength(1);
    expect(findDescendants).not.toHaveBeenCalled();
  });
});
