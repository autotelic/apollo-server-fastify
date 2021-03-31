## apollo-server-fastify

This is a self contained version of [apollo-server-fastify], completely detached from the [Apollo Server] monorepo. It has been modified to be compatible with [Fastify] v3.

### Usage

_*Only compatible with [Fastify] v3 or higher*_.

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
  await server.start();
  app.register(server.createHandler());
  await app.listen(3000);
})();
```

[apollo-server-fastify]: https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-fastify
[apollo server]: https://github.com/apollographql/apollo-server
[fastify]: https://www.fastify.io/docs/latest/
[fastify-accepts]: https://github.com/fastify/fastify-accepts
[fastify-cors]: https://github.com/fastify/fastify-accepts
[apollographql/apollo-server#3895]: https://github.com/apollographql/apollo-server/pull/3895
[apollographql/apollo-server#2391]: https://github.com/apollographql/apollo-server/pull/2391
