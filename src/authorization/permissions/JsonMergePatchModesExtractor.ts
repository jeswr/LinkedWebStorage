import { PERMISSIONS } from '@solidlab/policy-engine';
import type { AccessMap, Operation, ResourceSet } from '@solid/community-server';
import { IdentifierSetMultiMap, ModesExtractor, NotImplementedHttpError } from '@solid/community-server';
import { APPLICATION_MERGE_PATCH_JSON } from '../../util/ContentTypes';

/**
 * Determines the required access modes for JSON Merge Patch (RFC 7386) requests.
 *
 * A merge patch can replace and remove any value of the target resource,
 * and its result depends on the current state of the resource,
 * so it requires Read and Write permissions.
 * Create permissions are also required in case the target resource does not exist yet.
 */
export class JsonMergePatchModesExtractor extends ModesExtractor {
  private readonly resourceSet: ResourceSet;

  public constructor(resourceSet: ResourceSet) {
    super();
    this.resourceSet = resourceSet;
  }

  public async canHandle({ body }: Operation): Promise<void> {
    if (body.metadata.contentType !== APPLICATION_MERGE_PATCH_JSON) {
      throw new NotImplementedHttpError('Can only determine permissions of JSON Merge Patch documents.');
    }
  }

  public async handle({ target }: Operation): Promise<AccessMap> {
    const requiredModes: AccessMap = new IdentifierSetMultiMap();
    requiredModes.add(target, PERMISSIONS.Read);
    requiredModes.add(target, PERMISSIONS.Modify);
    if (!await this.resourceSet.hasResource(target)) {
      requiredModes.add(target, PERMISSIONS.Create);
    }
    return requiredModes;
  }
}
