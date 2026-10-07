import { getLoggerFor } from 'global-logger-factory';
import type { HttpRequest, RepresentationMetadata } from '@solid/community-server';
import { LDP, MetadataParser, parseLinkHeader, RDF } from '@solid/community-server';
import { LWS } from '../../../util/Vocabularies';

/**
 * Interprets `Link: <https://www.w3.org/ns/lws#Container>; rel="type"` request headers
 * as a request to create a container.
 *
 * LWS, §Create resource: "To create a Container, the client MUST include a `Link` header with `rel="type"`
 * pointing to the Container type."
 *
 * Internally, containers are identified by the `ldp:BasicContainer` type,
 * so that type is added to the metadata.
 */
export class LwsContainerTypeParser extends MetadataParser {
  protected readonly logger = getLoggerFor(this);

  public async handle(input: { request: HttpRequest; metadata: RepresentationMetadata }): Promise<void> {
    const isContainer = parseLinkHeader(input.request.headers.link).some(({ target, parameters }): boolean =>
      parameters.rel === 'type' && target === LWS.Container);
    if (isContainer) {
      this.logger.debug('Request contains the LWS container type.');
      input.metadata.add(RDF.terms.type, LDP.terms.BasicContainer);
    }
  }
}
