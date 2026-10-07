import type { HttpRequest } from '@solid/community-server';
import { RepresentationMetadata } from '@solid/community-server';
import { DepthParser } from '../../../../../src/http/input/metadata/DepthParser';
import { LWS_HTTP } from '../../../../../src/util/Vocabularies';

describe('A DepthParser', (): void => {
  const parser = new DepthParser();
  let request: HttpRequest;
  let metadata: RepresentationMetadata;

  beforeEach(async(): Promise<void> => {
    request = { headers: {}} as HttpRequest;
    metadata = new RepresentationMetadata();
  });

  it('does nothing if there is no Depth header.', async(): Promise<void> => {
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('stores the infinity value.', async(): Promise<void> => {
    request.headers.depth = ' Infinity ';
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(1);
    expect(metadata.get(LWS_HTTP.terms.depth)?.value).toBe('infinity');
  });

  it('ignores other values.', async(): Promise<void> => {
    request.headers.depth = '1';
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);

    (request.headers as any).depth = [ 'infinity' ];
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });
});
