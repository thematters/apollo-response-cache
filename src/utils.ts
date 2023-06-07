import type { Redis } from 'ioredis'

import { CACHE_KEY_PREFIX_FQC, CACHE_KEY_PREFIX_NODE_FQC } from './enums'

export type Node = { type: string; id: string }

/**
 * Generate cache key of Node and FQC hashes array mapping
 *
 * e.g. ['Article', 18] -> 'node-fqcs:Article:18'
 */
export const toNodeFQCKey = (node: Node): string => {
  return `${CACHE_KEY_PREFIX_NODE_FQC}:${node.type}:${node.id}`
}

/**
 * Record Node:FQC mapping
 *
 */
export const recordNodeFQCMapping = ({
  nodeFQCKeys,
  fqcKey,
  ttl,
  redis,
}: {
  nodeFQCKeys: string[]
  fqcKey: string
  ttl: number
  redis: Redis
}): void => {
  try {
    nodeFQCKeys.forEach((cacheKey: string) => {
      redis.sadd(cacheKey, fqcKey)
      redis.expire(cacheKey, ttl)
    })
  } catch (error) {
    console.warn(error)
  }
}

/**
 * Invalidate full query caches by the given related node keys
 */
export const invalidateFQC = async ({
  node,
  redis,
}: {
  node: Node
  redis: Redis
}): Promise<void> => {
  try {
    const key = toNodeFQCKey(node)
    const hashes = await redis.smembers(key)

    hashes.map(async (hash: string) => {
      await redis
        .pipeline()
        .del(`${CACHE_KEY_PREFIX_FQC}${hash}`)
        .srem(key, hash)
        .exec()
    })
  } catch (error) {
    console.warn(error)
  }
}
