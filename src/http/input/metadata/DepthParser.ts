import type { HttpRequest, RepresentationMetadata } from '@solid/community-server';
import { MetadataParser } from '@solid/community-server';
import { LWS_HTTP } from '../../../util/Vocabularies';

/**
 * Parses the `Depth` header (RFC 4918), which LWS clients use to request a recursive delete of a container.
 * Only the `infinity` value is stored, as that is the only value that changes the behaviour.
 */
export class DepthParser extends MetadataParser {
  public async handle(input: { request: HttpRequest; metadata: RepresentationMetadata }): Promise<void> {
    const depth = input.request.headers.depth;
    if (typeof depth === 'string' && depth.trim().toLowerCase() === 'infinity') {
      input.metadata.set(LWS_HTTP.terms.depth, 'infinity');
    }
  }
}
