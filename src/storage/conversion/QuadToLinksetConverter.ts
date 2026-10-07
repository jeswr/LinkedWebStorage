import type { Quad } from '@rdfjs/types';
import type { AuxiliaryIdentifierStrategy, Representation, RepresentationConverterArgs } from '@solid/community-server';
import {
  arrayifyStream,
  BaseTypedRepresentationConverter,
  BasicRepresentation,
  CONTENT_TYPE,
  INTERNAL_QUADS,
  NotImplementedHttpError,
  RepresentationMetadata,
} from '@solid/community-server';
import { APPLICATION_LINKSET_JSON } from '../../util/ContentTypes';
import { linksToLinkset } from '../../util/LinksetUtil';
import type { LinksetMapper } from './LinksetMapper';

/**
 * Converts the RDF metadata of a resource, as found in its metadata resource,
 * into an LWS linkset resource (`application/linkset+json`, RFC 9264).
 *
 * LWS, §Metadata: "For each resource in storage, a server MUST make metadata links available
 * as a standalone resource according to [RFC9264]."
 */
export class QuadToLinksetConverter extends BaseTypedRepresentationConverter {
  private readonly metadataStrategy: AuxiliaryIdentifierStrategy;
  private readonly mapper: LinksetMapper;

  public constructor(metadataStrategy: AuxiliaryIdentifierStrategy, mapper: LinksetMapper) {
    super(INTERNAL_QUADS, APPLICATION_LINKSET_JSON);
    this.metadataStrategy = metadataStrategy;
    this.mapper = mapper;
  }

  public async canHandle(args: RepresentationConverterArgs): Promise<void> {
    if (!this.metadataStrategy.isAuxiliaryIdentifier(args.identifier)) {
      throw new NotImplementedHttpError('Only metadata resources can be converted to a linkset.');
    }
    await super.canHandle(args);
  }

  public async handle({ identifier, representation }: RepresentationConverterArgs): Promise<Representation> {
    const quads = await arrayifyStream<Quad>(representation.data);
    const links = await this.mapper.toLinks(identifier, quads);
    const linkset = linksToLinkset(links, this.mapper.getSubject(identifier).path);
    const metadata = new RepresentationMetadata(representation.metadata, { [CONTENT_TYPE]: APPLICATION_LINKSET_JSON });
    return new BasicRepresentation(JSON.stringify(linkset), metadata);
  }
}
