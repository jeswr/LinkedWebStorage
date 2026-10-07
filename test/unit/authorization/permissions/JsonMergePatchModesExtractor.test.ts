import { PERMISSIONS } from '@solidlab/policy-engine';
import type { AccessMap, Operation, ResourceIdentifier, ResourceSet } from '@solid/community-server';
import { BasicRepresentation, IdentifierSetMultiMap, NotImplementedHttpError } from '@solid/community-server';
import { JsonMergePatchModesExtractor } from '../../../../src/authorization/permissions/JsonMergePatchModesExtractor';
import { compareMaps } from '../../../util/Util';

describe('A JsonMergePatchModesExtractor', (): void => {
  const target: ResourceIdentifier = { path: 'http://example.com/foo' };
  let operation: Operation;
  let resourceSet: jest.Mocked<ResourceSet>;
  let extractor: JsonMergePatchModesExtractor;

  function getMap(modes: string[]): AccessMap {
    return new IdentifierSetMultiMap(modes.map((mode): [ResourceIdentifier, string] => [ target, mode ]));
  }

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'PATCH',
      body: new BasicRepresentation('{}', 'application/merge-patch+json'),
      preferences: {},
      target,
    };

    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };

    extractor = new JsonMergePatchModesExtractor(resourceSet);
  });

  it('can only handle JSON Merge Patch documents.', async(): Promise<void> => {
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();

    operation.body = new BasicRepresentation('{}', 'application/json');
    await expect(extractor.canHandle(operation)).rejects.toThrow(NotImplementedHttpError);
  });

  it('requires read and write access.', async(): Promise<void> => {
    compareMaps(await extractor.handle(operation), getMap([ PERMISSIONS.Read, PERMISSIONS.Modify ]));
    expect(resourceSet.hasResource).toHaveBeenLastCalledWith(target);
  });

  it('also requires create access if the resource does not exist.', async(): Promise<void> => {
    resourceSet.hasResource.mockResolvedValueOnce(false);
    compareMaps(
      await extractor.handle(operation),
      getMap([ PERMISSIONS.Read, PERMISSIONS.Modify, PERMISSIONS.Create ]),
    );
  });
});
