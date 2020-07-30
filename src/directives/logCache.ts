import { defaultFieldResolver, GraphQLField } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'
import { get } from 'lodash'

import { toNodeFQCKey } from '../utils'

interface LogCacheDirectiveProps {
  /**
   * Custom function for resolving type from union and interface, or any other use cases.
   *
   * ```
   * // define
   * const typeResolver = (type: string, result: any) => {
   *   if (['Node', 'Response'].indexOf(type) >= 0) {
   *     return result.__type
   *   }
   *   return type
   * }
   *
   * const schema = makeExecutableSchema({
   *   schemaDirectives: {
   *     purgeCache: PurgeCacheDirective({ typeResolver }),
   *   }
   * })
   *
   * type Query {
   *   node(input: NodeInput!): Node @logCache(type: "Node")
   * }
   *
   * // resolved as `Article`
   * const nodeResult = { id: '2', __type: 'Article' }
   *
   * ```
   */
  typeResolver?: (type: string, node: any) => string
}

export const LogCacheDirective = ({
  typeResolver,
}: LogCacheDirectiveProps): typeof SchemaDirectiveVisitor => {
  class BaseLogCacheDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>): void {
      const { resolve = defaultFieldResolver } = field

      field.resolve = async (...args) => {
        const { type, identifier } = this.args
        const [root, _, { __nodeFQCKeySet, __redis }] = args
        const result = await resolve.apply(this, args)

        if (!__redis || !__nodeFQCKeySet) {
          return result
        }

        const nodes = Array.isArray(result) ? result : [result]

        nodes.forEach((node) => {
          const nodeType = typeResolver ? typeResolver(type, node) : type
          const nodeId =
            get(node, identifier) || get(node, 'id') || get(node, '_id')

          if (!nodeType || !nodeId) {
            return
          }

          try {
            __nodeFQCKeySet.add(toNodeFQCKey({ type: nodeType, id: nodeId }))
          } catch (error) {
            console.warn(error)
          }
        })

        return result
      }
    }
  }

  return BaseLogCacheDirective
}
