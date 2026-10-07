# Configuration options

The options in this folder replace the CSS option with the same path,
for example `lws:config/ldp/handler/lws.json` replaces `css:config/ldp/handler/default.json`.
The four configurations in this folder show how they are combined with the CSS options.
The `lws` options serve Linked Web Storage only, while the `solid-lws` options serve both protocols.

## http/handler

* *lws*: Same as the CSS *default*, but also includes the Linked Web Storage authorization server endpoints.

## identity/lws

The Linked Web Storage authorization server, which is imported next to the CSS identity options.
Exchanges authentication credentials for LWS access tokens using OAuth 2.0 Token Exchange.
Its metadata can be found at `/.well-known/lws-configuration`.

* *default*: Supports `did:key` credentials, self-issued credentials of agents with a controlled identifier document,
  and OpenID Connect ID tokens, including those of Solid-OIDC identity providers.

## ldp/authentication

* *lws*: Only accepts Linked Web Storage access tokens, issued by the LWS authorization server.
  Requests with an invalid token receive a 401 response with an `invalid_token` error.
* *solid-lws*: Accepts Linked Web Storage access tokens and Solid-OIDC DPoP and Bearer tokens.

## ldp/handler

* *lws*: Also serves the Linked Web Storage storage description on the storage root,
  access requests and grants, webhook notifications, recursive deletes and problem details,
  and returns 204 instead of 205 after successful modifications.
* *solid-lws*: Same as *lws*, but Solid clients keep receiving the root container
  when they do not explicitly request the storage description.

## ldp/metadata-parser

* *lws*: Also interprets `Link: <https://www.w3.org/ns/lws#Container>; rel="type"` as a request to create a container.

## ldp/metadata-writer

* *lws*: Also adds the Link headers and the `WWW-Authenticate` challenge required by Linked Web Storage.
* *solid-lws*: Same as *lws*, but the `WWW-Authenticate` challenge also contains the Solid `scope` parameter.

## ldp/modes

* *lws*: Same as the CSS *default*, but also supports JSON Merge Patch requests.

## storage/middleware

* *lws*: Same as the CSS *cache*, but the patching store also supports JSON Merge Patch on JSON resources,
  and on linkset resources as required by Linked Web Storage.

## util/representation-conversion

* *lws*: Also supports the Linked Web Storage container representation (`application/lws+json`),
  which is also returned for `application/ld+json` and `application/json` requests on containers,
  and the `application/linkset+json` representation of metadata resources.
* *solid-lws*: Same as *lws*, but containers are only represented as `application/lws+json`
  when that media type, or `application/json`, is explicitly requested.
  Solid clients requesting `application/ld+json` keep receiving the LDP representation.
