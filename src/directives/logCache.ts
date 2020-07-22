import { defaultFieldResolver, GraphQLField } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

import { CACHE_PREFIX } from '../enums'

interface Params {
  _type: string
}

export class LogCacheDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any> & Params): void {
    const { resolve = defaultFieldResolver } = field
    field._type = this.args.type
    field.resolve = async function (...args) {
      const [root, _, { cacheKeys, redis }] = args
      const result = await resolve.apply(this, args)

      if (result && result.id && redis && cacheKeys && field._type) {
        try {
          let cacheType = field._type
          switch (field._type) {
            case 'Node':
            case 'Response': {
              cacheType = result.__type
              break
            }
          }
          cacheKeys.add(`${CACHE_PREFIX.KEYS}:${cacheType}:${result.id}`)
        } catch (error) {
          // TOOD: logger
        }
      }

      return result
    }
  }
}
