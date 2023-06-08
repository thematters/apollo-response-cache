# apollo-response-cache

![Publish Status](https://github.com/thematters/apollo-response-cache/workflows/Publish/badge.svg) ![Test Status](https://github.com/thematters/apollo-response-cache/workflows/Test/badge.svg) [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

Caching and invalidation mechanisms (plugins, directives) of Apollo GraphQL, used by [`matters-server`](https://github.com/thematters/matters-server).

[`responseCachePlugin`](./src/plugins/responseCachePlugin.ts) is forked from [`apollo-server-plugin-response-cache`](https://github.com/apollographql/apollo-server/tree/main/packages/apollo-server-plugin-response-cache).

### How it works?

![Cache Mechanisms](./assets/cache-mechanisms.svg)

On each query request,

1. `responseCachePlugin` creates an empty key set, and injects it to the context.
2. `@logCache` collects nodes on its field, then add to the key set.
3. `responseCachePlugin` writes query response cache (`fqc`) and node-fqc key mapping to in-memory data store.

Once a mutation updates this node, `@purgeCache` will purge related `fqc`.

### Usage

*Note: there are breaking changes in API from 1.4.0 to 2.0.0,  see below Breaking changes section for more info*


Install package:

```bash
npm i @matters/apollo-response-cache
```

Add plugin and directives to the constructor:

```ts
import {
  logCacheDirective,
  purgeCacheDirective,
  responseCachePlugin,
} from '@matters/apollo-response-cache'

const {typeDef: logCacheDirectiveTypeDef, transformer: logCacheDirectiveTransformer} = logCacheDirective()
const {typeDef: purgeCacheDirectiveTypeDef, transformer: purgeCacheDirectiveTransformer} = purgeCacheDirective()

let schema = makeExecutableSchema({
  typeDefs: [yourTypeDef, logCacheDirectiveTypeDef, purgeCacheDirectiveTypeDef]
})

schema = logCacheDirectiveTransformer(
  purgeCacheDirectiveTransformer(schema)
)

const server = new ApolloServer({
  schema,
  plugins: [responseCachePlugin()],
})

```

Use in the schema:

```graphql
type Query {
  article(id: ID!): Article! @logCache(type: "Article")
}

type Mutation {
  archiveArticle(id: ID!): Article! @purgeCache(type: "Article")
}
```

You can also purge cache in the resolver:

```ts
const schema = makeExecutableSchema({
  schemaDirectives: {
    purgeCache: PurgeCacheDirective({ extraNodesPath: '__invalid_nodes__' }),
  },
})

const resolvers = {
  Mutation: {
    archiveArticle: (parent, args, context) => {
      // ...
      article.__invalid_nodes__ = [
        {
          id: '2',
          type: 'Article',
        },
        {
          id: '3',
          type: 'Comment',
        },
      ]

      return article
    },
  },
}
```

#### Customize node type & id resolvers

You might want a custom function to resolve node's type and id since it may be a `union` or `interface` type.

```ts
const typeResolver = (type: string, result: any) => {
  if (['Node', 'Response'].indexOf(type) >= 0) {
    return result.__type
  }
  return type
}
const idResolver = (type: string, result: any) => {
  if (['Node', 'Response'].indexOf(type) >= 0) {
    return result.__unusual_id__
  }
  return result.id
}

const schema = makeExecutableSchema({
  schemaDirectives: {
    purgeCache: PurgeCacheDirective({ typeResolver, idResolver }),
  },
})
```

### Breaking changes in 2.0.0

1. Support apollo-server v4 now, but drop support for apollo-server v3 and graphql-tools v8 and below
2. All APIs, including plugin option, directives, helpers interface, changed：
    a. pulgin constructor take redis client (type `Redis` from ioredis) instead of `RedisCache` from deprecated apollo-server-cache-redis
    b. invalidateFQC take redis instead of `RedisCache`
    c. directives api is totally changed to function way, as graphql-tools/utils v8 depreacated class base SchemaDirectiveVisitor


### TODOs

- [x] responseCachePlugin
- [x] @logCache
- [x] @purgeCache
- [ ] Unit Test
