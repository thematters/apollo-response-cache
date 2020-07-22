import { defaultFieldResolver, GraphQLField } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'
import { compact, replace, get } from 'lodash'

import { CACHE_KEYWORD, CACHE_PREFIX } from '../enums'

interface CacheSet {
  id: string
  type: string
}

const getCacheKeys = (customs: CacheSet[], fallback: CacheSet): string[] => {
  if (customs && customs.length > 0) {
    return compact(
      customs.map((custom: CacheSet) => {
        if (custom && custom.id && custom.type) {
          return `${CACHE_PREFIX.KEYS}:${custom.type}:${custom.id}`
        }
      })
    )
  }

  return [
    `${CACHE_PREFIX.KEYS}:${replace(fallback.type, '!', '')}:${fallback.id}`,
  ]
}

export class PurgeCacheDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>): void {
    const { resolve = defaultFieldResolver } = field
    field.resolve = async function (...args) {
      const [root, _, { redis }, { returnType }] = args

      const result = await resolve.apply(this, args)
      if (result && result.id && redis && returnType) {
        try {
          const cache = get(result, CACHE_KEYWORD, [])
          const keys = getCacheKeys(cache, {
            id: result.id,
            type: `${returnType}`,
          })
          keys.map(async (key: string) => {
            const hashes = await redis.client.smembers(key)
            hashes.map(async (hash: string) => {
              await redis.client
                .pipeline()
                .del(`fqc:${hash}`)
                .srem(key, hash)
                .exec()
            })
          })
        } catch (error) {
          // TODO: logger
        }
      }
      return result
    }
  }
}
