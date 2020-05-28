## apollo-server-fastify

This is a self contained version of [apollo-server-fastify], completely detatched from the [apollo-server] monorepo. It is based off of [this fork of apollo-server].

It differs from the current version of [apollo-server-fastify] in the following ways:

- The Fastify `reply` is now accessible within the object passed to the `config.context` function [apollographql/apollo-server#3895]
- The usage of `beforeHandler` has been replaced with `preHandler` [apollographql/apollo-server#2391]
  - The versions of [fastify-accepts] and [fastify-cors] have also been updated.

### Usage

```shell
npm install @autotelic/apollo-server-fastify
```

```js
const { ApolloServer } = require('apollo-server-fastify');
const { typeDefs, resolvers } = require('./module');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ request, reply }) => ({
    fastifyReq: request,
    fastifyReply: reply,
  }),
});

const app = require('fastify')();

(async function() {
  app.register(server.createHandler());
  await app.listen(3000);
})();
```

[apollo-server-fastify]: https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-fastify
[apollo-server]: https://github.com/apollographql/apollo-server
[this fork of apollo-server]: https://github.com/autotelic/apollo-server
[fastify-accepts]: https://github.com/fastify/fastify-accepts
[fastify-cors]: https://github.com/fastify/fastify-accepts
[apollographql/apollo-server#3895]: https://github.com/apollographql/apollo-server/pull/3895
[apollographql/apollo-server#2391]: https://github.com/apollographql/apollo-server/pull/2391
