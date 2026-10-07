import { STATUS_CODES } from 'node:http';
import type { Representation, RepresentationConverterArgs } from '@solid/community-server';
import {
  BaseTypedRepresentationConverter,
  BasicRepresentation,
  extractErrorTerms,
  getSingleItem,
  HttpError,
  INTERNAL_ERROR,
  isError,
  OAuthHttpError,
} from '@solid/community-server';
import { APPLICATION_PROBLEM_JSON } from '../../util/ContentTypes';

/**
 * Converts an Error object to a problem details document (RFC 9457) with the `application/problem+json` media type.
 *
 * LWS, §Error Handling: servers SHOULD use problem details to describe errors.
 *
 * The CSS error code is used as the `type` of the problem,
 * and the error details and OAuth fields are added as extension members.
 */
export class ErrorToProblemJsonConverter extends BaseTypedRepresentationConverter {
  /**
   * @param outputPreference - The weight of the output type. Defaults to 1.
   */
  public constructor(outputPreference = 1) {
    super(INTERNAL_ERROR, { [APPLICATION_PROBLEM_JSON]: outputPreference });
  }

  public async handle({ representation }: RepresentationConverterArgs): Promise<Representation> {
    const error = await getSingleItem(representation.data);
    const problem = JSON.stringify(this.toProblem(error));
    return new BasicRepresentation(problem, representation.metadata, APPLICATION_PROBLEM_JSON);
  }

  private toProblem(error: unknown): Record<string, unknown> {
    if (!isError(error)) {
      return { title: STATUS_CODES[500], status: 500 };
    }
    const status = HttpError.isInstance(error) ? error.statusCode : 500;
    const problem: Record<string, unknown> = {
      type: HttpError.isInstance(error) ? `urn:solid-server:error:${error.errorCode}` : 'about:blank',
      title: STATUS_CODES[status] ?? error.name,
      status,
    };
    if (error.message) {
      problem.detail = error.message;
    }
    if (HttpError.isInstance(error)) {
      const details = extractErrorTerms(error.metadata);
      if (Object.keys(details).length > 0) {
        problem.details = details;
      }
      if (OAuthHttpError.isInstance(error)) {
        Object.assign(problem, error.mandatoryFields);
      }
    }
    if (error.stack) {
      problem.stack = error.stack;
    }
    return problem;
  }
}
