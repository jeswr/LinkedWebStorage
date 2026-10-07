import { createResponse } from 'node-mocks-http';
import type {
  AuxiliaryStrategy,
  HttpResponse,
  IdentifierStrategy,
  ResourceIdentifier,
  StorageLocationStrategy,
} from '@solid/community-server';
import { LDP, NotFoundHttpError, RDF, RepresentationMetadata, SOLID_ERROR, SOLID_HTTP } from '@solid/community-server';
import { LwsLinkMetadataWriter } from '../../../../../src/http/output/metadata/LwsLinkMetadataWriter';
import { PAGINATION_RELATIONS } from '../../../../../src/storage/conversion/ContainerToLwsJsonConverter';
import { LWS } from '../../../../../src/util/Vocabularies';

function resourceMetadata(path: string): RepresentationMetadata {
  return new RepresentationMetadata({ path }, { [RDF.type]: LDP.terms.Resource });
}

describe('A LwsLinkMetadataWriter', (): void => {
  const storage: ResourceIdentifier = { path: 'http://example.com/' };
  let response: HttpResponse;
  let storageStrategy: jest.Mocked<StorageLocationStrategy>;
  let identifierStrategy: jest.Mocked<IdentifierStrategy>;
  let auxiliaryStrategy: jest.Mocked<AuxiliaryStrategy>;
  let linksetStrategy: jest.Mocked<AuxiliaryStrategy>;
  let writer: LwsLinkMetadataWriter;

  function links(): string[] {
    const header = response.getHeader('link');
    if (header === undefined) {
      return [];
    }
    return Array.isArray(header) ? header : [ String(header) ];
  }

  beforeEach(async(): Promise<void> => {
    response = createResponse();

    storageStrategy = {
      getStorageIdentifier: jest.fn().mockResolvedValue(storage),
    };

    identifierStrategy = {
      isRootContainer: jest.fn().mockReturnValue(false),
      getParentContainer: jest.fn((id: ResourceIdentifier): ResourceIdentifier =>
        ({ path: id.path.replace(/[^/]+\/?$/u, '') })),
    } as any;

    auxiliaryStrategy = {
      isAuxiliaryIdentifier: jest.fn().mockReturnValue(false),
    } as any;

    linksetStrategy = {
      getAuxiliaryIdentifier: jest.fn((id: ResourceIdentifier): ResourceIdentifier => ({ path: `${id.path}.linkset` })),
    } as any;

    writer = new LwsLinkMetadataWriter(storageStrategy, identifierStrategy, auxiliaryStrategy, linksetStrategy);
  });

  it('adds no headers if there is no relevant metadata.', async(): Promise<void> => {
    await expect(writer.handle({ response, metadata: new RepresentationMetadata() })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
    expect(storageStrategy.getStorageIdentifier).not.toHaveBeenCalled();
  });

  it('adds all links for a document.', async(): Promise<void> => {
    const metadata = resourceMetadata('http://example.com/foo/bar');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(links()).toEqual([
      `<http://example.com/>; rel="${LWS.storage}"`,
      '<http://example.com/foo/>; rel="up"',
      `<${LWS.DataResource}>; rel="type"`,
      '<http://example.com/foo/bar.linkset>; rel="linkset"; type="application/linkset+json"',
    ]);
  });

  it('adds the container type for containers.', async(): Promise<void> => {
    const metadata = resourceMetadata('http://example.com/foo/');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(links()).toEqual([
      `<http://example.com/>; rel="${LWS.storage}"`,
      '<http://example.com/>; rel="up"',
      `<${LWS.Container}>; rel="type"`,
      '<http://example.com/foo/.linkset>; rel="linkset"; type="application/linkset+json"',
    ]);
  });

  it('does not add the type link if the metadata already contains that type.', async(): Promise<void> => {
    const metadata = resourceMetadata('http://example.com/foo/');
    metadata.add(RDF.terms.type, LWS.terms.Container);
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(links()).not.toContain(`<${LWS.Container}>; rel="type"`);
    expect(links()).toHaveLength(3);
  });

  it('does not add an up link for the storage root.', async(): Promise<void> => {
    const metadata = resourceMetadata('http://example.com/');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(links()).toEqual([
      `<http://example.com/>; rel="${LWS.storage}"`,
      `<${LWS.Container}>; rel="type"`,
      '<http://example.com/.linkset>; rel="linkset"; type="application/linkset+json"',
    ]);
    expect(identifierStrategy.getParentContainer).not.toHaveBeenCalled();
  });

  it('does not add an up link for the root container if no storage was found.', async(): Promise<void> => {
    storageStrategy.getStorageIdentifier.mockRejectedValueOnce(new NotFoundHttpError());
    identifierStrategy.isRootContainer.mockReturnValueOnce(true);
    const metadata = resourceMetadata('http://example.com/');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(links()).toEqual([
      `<${LWS.Container}>; rel="type"`,
      '<http://example.com/.linkset>; rel="linkset"; type="application/linkset+json"',
    ]);
  });

  it('still adds the other links if no storage was found.', async(): Promise<void> => {
    storageStrategy.getStorageIdentifier.mockRejectedValueOnce(new NotFoundHttpError());
    const metadata = resourceMetadata('http://example.com/foo');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(links()).toEqual([
      '<http://example.com/>; rel="up"',
      `<${LWS.DataResource}>; rel="type"`,
      '<http://example.com/foo.linkset>; rel="linkset"; type="application/linkset+json"',
    ]);
  });

  it('only adds the storage link for auxiliary resources.', async(): Promise<void> => {
    auxiliaryStrategy.isAuxiliaryIdentifier.mockReturnValueOnce(true);
    const metadata = resourceMetadata('http://example.com/foo.acl');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(links()).toEqual([ `<http://example.com/>; rel="${LWS.storage}"` ]);
  });

  it('uses the location for responses to create requests.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [SOLID_HTTP.location]: 'http://example.com/foo/new' });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(storageStrategy.getStorageIdentifier).toHaveBeenLastCalledWith({ path: 'http://example.com/foo/new' });
    expect(links()).toEqual([
      `<http://example.com/>; rel="${LWS.storage}"`,
      '<http://example.com/foo/>; rel="up"',
      `<${LWS.DataResource}>; rel="type"`,
      '<http://example.com/foo/new.linkset>; rel="linkset"; type="application/linkset+json"',
    ]);
  });

  it('only adds the storage link for error responses with a target.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [SOLID_ERROR.target]: 'http://example.com/foo' });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(storageStrategy.getStorageIdentifier).toHaveBeenLastCalledWith({ path: 'http://example.com/foo' });
    expect(links()).toEqual([ `<http://example.com/>; rel="${LWS.storage}"` ]);
  });

  it('only adds the storage link for the storage description.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ path: 'http://example.com/' }, 'application/lws+cid');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(links()).toEqual([ `<http://example.com/>; rel="${LWS.storage}"` ]);
  });

  it('adds pagination links for paginated container listings.', async(): Promise<void> => {
    const metadata = resourceMetadata('http://example.com/foo/');
    metadata.add(PAGINATION_RELATIONS.first, 'http://example.com/foo/?page=1');
    metadata.add(PAGINATION_RELATIONS.last, 'http://example.com/foo/?page=3');
    metadata.add(PAGINATION_RELATIONS.prev, 'http://example.com/foo/?page=1');
    metadata.add(PAGINATION_RELATIONS.next, 'http://example.com/foo/?page=3');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(links()).toEqual([
      `<http://example.com/>; rel="${LWS.storage}"`,
      '<http://example.com/>; rel="up"',
      `<${LWS.Container}>; rel="type"`,
      '<http://example.com/foo/.linkset>; rel="linkset"; type="application/linkset+json"',
      '<http://example.com/foo/?page=1>; rel="first"',
      '<http://example.com/foo/?page=3>; rel="last"',
      '<http://example.com/foo/?page=3>; rel="next"',
      '<http://example.com/foo/?page=1>; rel="prev"',
    ]);
  });
});
