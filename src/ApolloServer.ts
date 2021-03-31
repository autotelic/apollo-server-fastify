import { renderPlaygroundPage } from '@apollographql/graphql-playground-html';
import { Accepts } from 'accepts';
import {
  ApolloServerBase,
  FileUploadOptions,
  formatApolloErrors,
  PlaygroundRenderPageOptions,
  processFileUploads,
  GraphQLOptions,
} from 'apollo-server-core';
import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import { IncomingMessage, ServerResponse, Server } from 'http';
import { graphqlFastify } from './fastifyApollo';
import { GraphQLOperation } from '@apollographql/graphql-upload-8-fork';

const fastJson = require('fast-json-stringify');

export interface ServerRegistration {
  path?: string;
  cors?: object | boolean;
  onHealthCheck?: (request: FastifyRequest) => Promise<any>;
  disableHealthCheck?: boolean;
}

const stringifyHealthCheck = fastJson({
  type: 'object',
  properties: {
    status: {
      type: 'string',
    },
  },
});

const fileUploadMiddleware = (
  uploadsConfig: FileUploadOptions,
  server: ApolloServerBase,
) => (
  request: FastifyRequest,
  reply: FastifyReply,
  done: (err: Error | null, body?: any) => void,
): void => {
  const contentType = request.headers['content-type'] || '';
  if (
    contentType.split(';')[0] === 'multipart/form-data' &&
    typeof processFileUploads === 'function'
  ) {
    processFileUploads(request.raw, reply.raw, uploadsConfig)
      .then((body: GraphQLOperation | GraphQLOperation[]) => {
        request.body = body;
        done(null);
      })
      .catch((error: any) => {
        if (error.status && error.expose) reply.status(error.status);

        throw formatApolloErrors([error], {
          formatter: server.requestOptions.formatError,
          debug: server.requestOptions.debug,
        });
      });
  } else {
    done(null);
  }
};

export class ApolloServer extends ApolloServerBase {
  protected supportsSubscriptions(): boolean {
    return true;
  }

  protected supportsUploads(): boolean {
    return true;
  }

  async createGraphQLServerOptions(
    request?: FastifyRequest,
    reply?: FastifyReply,
  ): Promise<GraphQLOptions> {
    return this.graphQLServerOptions({ request, reply });
  }

  public createHandler({
    path,
    cors,
    disableHealthCheck,
    onHealthCheck,
  }: ServerRegistration = {}): FastifyPluginAsync {
    this.graphqlPath = path ? path : '/graphql';
    const promiseWillStart = this.willStart();

    this.ensureStarting();

    return async (
      app: FastifyInstance<Server, IncomingMessage, ServerResponse>,
    ): Promise<void> => {
      await promiseWillStart;

      if (!disableHealthCheck) {
        app.get('/.well-known/apollo/server-health', async (request, reply) => {
          // Response follows https://tools.ietf.org/html/draft-inadarei-api-health-check-01
          reply.type('application/health+json');

          if (onHealthCheck) {
            try {
              await onHealthCheck(request);
              reply.send(stringifyHealthCheck({ status: 'pass' }));
            } catch (e) {
              reply.status(503).send(stringifyHealthCheck({ status: 'fail' }));
            }
          } else {
            reply.send(stringifyHealthCheck({ status: 'pass' }));
          }
        });
      }

      app.register(
        async instance => {
          instance.register(require('fastify-accepts'));

          if (cors === true) {
            instance.register(require('fastify-cors'));
          } else if (cors !== false) {
            instance.register(require('fastify-cors'), cors);
          }

          instance.setNotFoundHandler((_request, reply) => {
            reply.code(405);
            reply.header('allow', 'GET, POST');
            reply.send();
          });

          const preHandlers = [
            (
              request: FastifyRequest,
              reply: FastifyReply,
              done: () => void,
            ): void => {
              // Note: if you enable playground in production and expect to be able to see your
              // schema, you'll need to manually specify `introspection: true` in the
              // ApolloServer constructor; by default, the introspection query is only
              // enabled in dev.
              if (this.playgroundOptions && request.raw.method === 'GET') {
                // perform more expensive content-type check only if necessary
                const accept = (request as any).accepts() as Accepts;
                const types = accept.types() as string[];
                const prefersHTML =
                  types.find(
                    (x: string) =>
                      x === 'text/html' || x === 'application/json',
                  ) === 'text/html';

                if (prefersHTML) {
                  const playgroundRenderPageOptions: PlaygroundRenderPageOptions = {
                    endpoint: this.graphqlPath,
                    subscriptionEndpoint: this.subscriptionsPath,
                    ...this.playgroundOptions,
                  };
                  reply.type('text/html');
                  const playground = renderPlaygroundPage(
                    playgroundRenderPageOptions,
                  );
                  reply.send(playground);
                  return;
                }
              }
              done();
            },
          ];

          if (typeof processFileUploads === 'function' && this.uploadsConfig) {
            instance.register(require('fastify-multipart'));

            preHandlers.push(fileUploadMiddleware(this.uploadsConfig, this));
          }

          instance.route({
            method: ['GET', 'POST'],
            url: '/',
            preHandler: preHandlers,
            handler: await graphqlFastify(
              this.createGraphQLServerOptions.bind(this),
            ),
          });
        },
        {
          prefix: this.graphqlPath,
        },
      );
    };
  }
}
