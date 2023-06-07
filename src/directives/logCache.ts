import { defaultFieldResolver, GraphQLSchema } from 'graphql'
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'

import { toNodeFQCKey } from '../utils'

interface LogCacheDirectiveOption {
  /**
   * Custom function to resolve node type and id.
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
   * let schema = makeExecutableSchema(..)
   *
   * schema = logCacheDirectiveTransformer(schema, 'logCache', {typeResolver, idResolver})
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
  idResolver?: (type: string, node: any) => string
}

export const logCacheDirective = (directiveName: string) => ({
  typeDef: `directive @${directiveName}(type: String! identifier: String = "id") on FIELD_DEFINITION`,

  transformer: (schema: GraphQLSchema, options: LogCacheDirectiveOption) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0]

        if (directive) {
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async (source, args, context, info) => {
            const result = await resolve(source, args, context, info)

            const { type, identifier } = directive
            const { __nodeFQCKeySet } = context

            if (!__nodeFQCKeySet) {
              return result
            }

            const nodes = Array.isArray(result) ? result : [result]
            const { typeResolver, idResolver } = options
            nodes.forEach((node) => {
              const nodeType = typeResolver ? typeResolver(type, node) : type
              const nodeId = idResolver
                ? idResolver(type, node)
                : node[identifier] || node['id'] || node['_id']

              if (!nodeType || !nodeId) {
                return
              }

              try {
                __nodeFQCKeySet.add(
                  toNodeFQCKey({ type: nodeType, id: nodeId })
                )
              } catch (error) {
                console.warn(error)
              }
            })
            return result
          }

          return fieldConfig
        }
      },
    })
  },
})
