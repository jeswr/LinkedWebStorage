import type { RepresentationMetadata } from '@solid/community-server';
import { ResponseDescription } from '@solid/community-server';

/**
 * Corresponds to a 204 response.
 */
export class NoContentResponseDescription extends ResponseDescription {
  public constructor(metadata?: RepresentationMetadata) {
    super(204, metadata);
  }
}
