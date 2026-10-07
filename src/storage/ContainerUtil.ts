import type { Operation, ResourceIdentifier, ResourceStore } from '@solid/community-server';
import { INTERNAL_QUADS, isContainerIdentifier, LDP, readableToQuads } from '@solid/community-server';
import { LWS_HTTP } from '../util/Vocabularies';

/**
 * Determines whether the operation is a recursive delete of a container:
 * a DELETE request with a `Depth: infinity` header that targets a container.
 */
export function isRecursiveDelete(operation: Operation): boolean {
  return operation.method === 'DELETE' && isContainerIdentifier(operation.target) &&
    operation.body.metadata.get(LWS_HTTP.terms.depth)?.value === 'infinity';
}

/**
 * Returns all resources transitively contained in the given container,
 * ordered so that every resource comes before the container that contains it.
 */
export async function findDescendants(store: ResourceStore, container: ResourceIdentifier):
Promise<ResourceIdentifier[]> {
  const representation = await store.getRepresentation(container, { type: { [INTERNAL_QUADS]: 1 }});
  const quads = await readableToQuads(representation.data);
  const result: ResourceIdentifier[] = [];
  for (const member of quads.getObjects(container.path, LDP.terms.contains, null)) {
    const identifier = { path: member.value };
    if (isContainerIdentifier(identifier)) {
      result.push(...await findDescendants(store, identifier));
    }
    result.push(identifier);
  }
  return result;
}
