import { PERMISSIONS } from '@solidlab/policy-engine';
import type { AccessMap, Operation, ResourceSet, ResourceStore } from '@solid/community-server';
import { ModesExtractor } from '@solid/community-server';
import { findDescendants, isRecursiveDelete } from '../../storage/ContainerUtil';

/**
 * Adds the `delete` mode on all resources in a container to the modes of a recursive delete of that container,
 * as requested with the `Depth: infinity` header.
 * See {@link isRecursiveDelete}.
 */
export class RecursiveDeleteModesExtractor extends ModesExtractor {
  private readonly source: ModesExtractor;
  private readonly resourceSet: ResourceSet;
  private readonly store: ResourceStore;

  public constructor(source: ModesExtractor, resourceSet: ResourceSet, store: ResourceStore) {
    super();
    this.source = source;
    this.resourceSet = resourceSet;
    this.store = store;
  }

  public async canHandle(operation: Operation): Promise<void> {
    await this.source.canHandle(operation);
  }

  public async handle(operation: Operation): Promise<AccessMap> {
    const accessMap = await this.source.handle(operation);
    if (isRecursiveDelete(operation) && await this.resourceSet.hasResource(operation.target)) {
      for (const descendant of await findDescendants(this.store, operation.target)) {
        accessMap.add(descendant, PERMISSIONS.Delete);
      }
    }
    return accessMap;
  }
}
