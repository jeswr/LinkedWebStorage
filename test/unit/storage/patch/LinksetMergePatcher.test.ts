import 'jest-rdf';
import type { Quad } from '@rdfjs/types';
import { DataFactory } from 'n3';
import type { Patch, Representation } from '@solid/community-server';
import {
  arrayifyStream,
  BasicRepresentation,
  ConflictHttpError,
  DC,
  InternalServerError,
  LDP,
  RDF,
  SingleRootIdentifierStrategy,
} from '@solid/community-server';
import { UnprocessableEntityHttpError } from '@solid/community-server/dist/util/errors/UnprocessableEntityHttpError';
import { LinksetMapper } from '../../../../src/storage/conversion/LinksetMapper';
import { LinksetMergePatcher } from '../../../../src/storage/patch/LinksetMergePatcher';
import { SimpleSuffixStrategy } from '../../../util/SimpleSuffixStrategy';

function getPatch(body: unknown, contentType = 'application/merge-patch+json'): Patch {
  return new BasicRepresentation(JSON.stringify(body), contentType);
}

describe('A LinksetMergePatcher', (): void => {
  const subject = 'http://test.com/foo';
  const identifier = { path: 'http://test.com/foo.meta' };
  const metadataStrategy = new SimpleSuffixStrategy('.meta');
  const mapper = new LinksetMapper(metadataStrategy, new SingleRootIdentifierStrategy('http://test.com/'));
  const original = [
    DataFactory.quad(DataFactory.namedNode(subject), RDF.terms.type, LDP.terms.Resource),
    DataFactory.quad(DataFactory.namedNode(subject), RDF.terms.type, DataFactory.namedNode('http://example.com/Old')),
    DataFactory.quad(DataFactory.namedNode(subject), DC.terms.modified, DataFactory.literal('2024-01-01T00:00:00Z')),
  ];
  let patch: Patch;
  let representation: Representation;
  let patcher: LinksetMergePatcher;

  beforeEach(async(): Promise<void> => {
    patch = getPatch({ linkset: [{ anchor: subject, type: [{ href: 'http://example.com/New' }]}]});
    representation = new BasicRepresentation(original, identifier, 'internal/quads');
    patcher = new LinksetMergePatcher(metadataStrategy, mapper);
  });

  describe('canHandle', (): void => {
    it('accepts JSON Merge Patch documents on linkset resources.', async(): Promise<void> => {
      await expect(patcher.canHandle({ identifier, patch, representation })).resolves.toBeUndefined();
    });

    it('rejects other patch types.', async(): Promise<void> => {
      patch = getPatch({}, 'application/sparql-update');
      await expect(patcher.canHandle({ identifier, patch, representation }))
        .rejects.toThrow('Only JSON Merge Patch documents are supported.');
    });

    it('rejects other resources.', async(): Promise<void> => {
      await expect(patcher.canHandle({ identifier: { path: subject }, patch, representation }))
        .rejects.toThrow('Only linkset resources are supported.');
    });
  });

  describe('handle', (): void => {
    it('applies the patch to the linkset and converts the result back to metadata.', async(): Promise<void> => {
      const result = await patcher.handle({ identifier, patch, representation });
      expect(result.metadata.identifier.value).toBe(identifier.path);
      expect(result.metadata.contentType).toBe('internal/quads');
      const quads = await arrayifyStream<Quad>(result.data);
      expect(quads).toEqualRdfQuadArray([
        original[0],
        original[2],
        DataFactory.quad(DataFactory.namedNode(subject), RDF.terms.type, DataFactory.namedNode('http://example.com/New')),
      ]);
    });

    it('errors if the linkset does not exist.', async(): Promise<void> => {
      await expect(patcher.handle({ identifier, patch })).rejects.toThrow(ConflictHttpError);
      await expect(patcher.handle({ identifier, patch }))
        .rejects.toThrow('Linkset resources can not be created directly.');
    });

    it('errors if the representation is not a quad stream.', async(): Promise<void> => {
      representation = new BasicRepresentation('', identifier, 'text/turtle');
      await expect(patcher.handle({ identifier, patch, representation })).rejects.toThrow(InternalServerError);
    });

    it('rejects links with a different anchor.', async(): Promise<void> => {
      patch = getPatch({ linkset: [
        { anchor: subject },
        { anchor: 'http://test.com/other', type: [{ href: 'http://example.com/New' }]},
      ]});
      const result = patcher.handle({ identifier, patch, representation });
      await expect(result).rejects.toThrow(ConflictHttpError);
      await expect(result).rejects.toThrow(`This linkset can only contain links with anchor ${subject}.`);
    });

    it('rejects patches resulting in an invalid linkset.', async(): Promise<void> => {
      patch = getPatch({ linkset: 'invalid' });
      await expect(patcher.handle({ identifier, patch, representation }))
        .rejects.toThrow(UnprocessableEntityHttpError);
    });
  });
});
