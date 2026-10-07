import { createResponse } from 'node-mocks-http';
import type { HttpResponse, StorageLocationStrategy } from '@solid/community-server';
import { HTTP, NotFoundHttpError, RepresentationMetadata, SOLID_ERROR } from '@solid/community-server';
import { LwsWwwAuthMetadataWriter } from '../../../../../src/http/output/metadata/LwsWwwAuthMetadataWriter';
import { LWS_ERROR } from '../../../../../src/util/Vocabularies';

describe('A LwsWwwAuthMetadataWriter', (): void => {
  const asUri = 'http://as.example.com/';
  let storageStrategy: jest.Mocked<StorageLocationStrategy>;
  let response: HttpResponse;
  let writer: LwsWwwAuthMetadataWriter;

  beforeEach(async(): Promise<void> => {
    response = createResponse();
    storageStrategy = {
      getStorageIdentifier: jest.fn().mockResolvedValue({ path: 'http://example.com/' }),
    };
    writer = new LwsWwwAuthMetadataWriter(asUri, storageStrategy);
  });

  it('adds no header if there is no relevant metadata.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata();
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
  });

  it('adds no header if the status code is not 401.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [HTTP.statusCodeNumber]: '403' });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
  });

  it('adds a header with only the authorization server if there is no target.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [HTTP.statusCodeNumber]: '401' });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ 'www-authenticate': `Bearer as_uri="${asUri}"` });
    expect(storageStrategy.getStorageIdentifier).not.toHaveBeenCalled();
  });

  it('adds the storage as realm if there is a target.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({
      [HTTP.statusCodeNumber]: '401',
      [SOLID_ERROR.target]: 'http://example.com/foo',
    });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({
      'www-authenticate': `Bearer as_uri="${asUri}", realm="http://example.com/"`,
    });
    expect(storageStrategy.getStorageIdentifier).toHaveBeenLastCalledWith({ path: 'http://example.com/foo' });
  });

  it('adds no realm if no storage could be found.', async(): Promise<void> => {
    storageStrategy.getStorageIdentifier.mockRejectedValueOnce(new NotFoundHttpError());
    const metadata = new RepresentationMetadata({
      [HTTP.statusCodeNumber]: '401',
      [SOLID_ERROR.target]: 'http://example.com/foo',
    });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ 'www-authenticate': `Bearer as_uri="${asUri}"` });
  });

  it('adds the error and extra parameters if relevant.', async(): Promise<void> => {
    writer = new LwsWwwAuthMetadataWriter(asUri, storageStrategy, 'scope="openid webid"');
    const metadata = new RepresentationMetadata({
      [HTTP.statusCodeNumber]: '401',
      [SOLID_ERROR.target]: 'http://example.com/foo',
      [LWS_ERROR.bearerError]: 'invalid_token',
    });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({
      'www-authenticate':
        `Bearer as_uri="${asUri}", realm="http://example.com/", error="invalid_token", scope="openid webid"`,
    });
  });
});
