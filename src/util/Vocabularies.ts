import { createVocabulary } from 'rdf-vocabulary';
import { SOLID_ERROR, SOLID_HTTP } from '@solid/community-server';

export const LWS = createVocabulary(
  'https://www.w3.org/ns/lws#',
  'storage',

  'Container',
  'DataResource',
  'OpenIdProvider',
  'Storage',
  'StorageResource',
);

/**
 * Additional terms in the namespace of {@link SOLID_ERROR}.
 */
export const LWS_ERROR = createVocabulary(
  SOLID_ERROR.namespace,
  // The OAuth 2.0 error code of a failed bearer token validation, as used in the WWW-Authenticate header
  'bearerError',
);

/**
 * Additional terms in the namespace of {@link SOLID_HTTP}.
 */
export const LWS_HTTP = createVocabulary(
  SOLID_HTTP.namespace,
  // Set to `infinity` when the request has a `Depth: infinity` header
  'depth',
);
