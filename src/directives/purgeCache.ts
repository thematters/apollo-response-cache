import { defaultFieldResolver, GraphQLSchema } from 'graphql'
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'

import { invalidateFQC, Node } from '../utils'

interface PurgeCacheDirectiveOption {
  /**
   * The path to get extra nodes from result object.
   *
   * ```
   * // define
   * const schema = makeExecutableSchema({
   *   schemaDirectives: {
   *     purgeCache: PurgeCacheDirective({ extraNodesPath: '__invalid_nodes__' }),
   *   }
   * })
   *
   * type Mutation {
   *   editArticle(id: ID!): Article! @purgeCache(type: "Article")
   * }
   *
   * // @purgeCache will invalidate three nodes: Article:1, Article:2 and Comment:3.
   * const editArticleResult = {
   *   id: '1',
   *   content: '...',
   *   __invalid_nodes__: [
   *     { id: '2', type: 'Article' },
   *     { id: '3', type: 'Comment' }
   *   ]
   * }
   * ```
   */
  extraNodesPath?: string
  /**
   * Custom function to resolve type and id.
   *
   * Same as `@logCache`, see `logCache.ts` for details.
   **/
  typeResolver?: (type: string, node: any) => string
  idResolver?: (type: string, node: any) => string
}

export const purgeCacheDirective = (directiveName = 'purgeCache') => ({
  typeDef: `directive @${directiveName}(type: String! identifier: String = "id") on FIELD_DEFINITION`,

  transformer: (schema: GraphQLSchema, options: PurgeCacheDirectiveOption) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0]

        if (directive) {
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async (source, args, context, info) => {
            const result = await resolve(source, args, context, info)

            const { type, identifier } = directive
            const { __redis } = context

            if (!__redis) {
              return result
            }

            const results = Array.isArray(result) ? [...result] : [result]
            const parsedResults: Node[] = []
            const { typeResolver, idResolver, extraNodesPath } = options
            results.map((node) => {
              const nodeType = typeResolver ? typeResolver(type, node) : type
              const nodeId = idResolver
                ? idResolver(type, node)
                : node[identifier] || node['id'] || node['_id']

              if (!nodeType || !nodeId) {
                return
              }

              parsedResults.push({ type: nodeType, id: nodeId })
            })

            // merge results and extras
            const extraNodes: Node[] = extraNodesPath
              ? (result as any)[extraNodesPath] || []
              : []
            const nodes = [...extraNodes, ...parsedResults]

            // invalidate
            nodes.forEach((node) => {
              invalidateFQC({
                node,
                redis: __redis,
              })
            })

            return result
          }
        }
        return fieldConfig
      },
    })
  },
})
