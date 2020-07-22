# matters-server-cache

![Deploy Status](https://github.com/thematters/matters-server-cache/workflows/Build%20&%20Publish/badge.svg) ![Release Status](https://github.com/thematters/matters-server-cache/workflows/Create%20Release/badge.svg) [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

Cache mechanisms (plugins, directives) of Apollo GraphQL used by `matters-server`

## Plugins

### Response Cache plugin

Forked from [`apollo-server-plugin-response-cache`](https://github.com/apollographql/apollo-server/tree/main/packages/apollo-server-plugin-response-cache), works with `@logCache` and `@purgeCache` directives.

```ts
import { responseCachePlugin } from '@matters/matters-server-cache'

const server = new ApolloServer({
  // ...
  plugins: [responseCachePlugin()],
})
```

## Directives

### @logCache

### @purgeCache
