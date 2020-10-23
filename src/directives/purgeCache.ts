import { defaultFieldResolver, GraphQLField } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'
import { get } from 'lodash'

import { invalidateFQC, Node } from '../utils'

interface PurgeCacheDirectiveProps {
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

export const PurgeCacheDirective = ({
  extraNodesPath,
  typeResolver,
  idResolver,
}: PurgeCacheDirectiveProps): typeof SchemaDirectiveVisitor => {
  class BasePurgeCacheDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>): void {
      const { resolve = defaultFieldResolver } = field

      field.resolve = async (...args) => {
        const { type, identifier } = this.args
        const [root, _, { __redis }] = args
        const result = await resolve.apply(this, args)

        if (!__redis) {
          return result
        }

        // parse results
        const results = Array.isArray(result) ? [...result] : [result]
        const parsedResults: Node[] = []
        results.map((node) => {
          const nodeType = typeResolver ? typeResolver(type, node) : type
          const nodeId = idResolver
            ? idResolver(type, node)
            : get(node, identifier) || get(node, 'id') || get(node, '_id')

          if (!nodeType || !nodeId) {
            return
          }

          parsedResults.push({ type: nodeType, id: nodeId })
        })

        // merge results and extras
        const extraNodes: Node[] = extraNodesPath
          ? get(result, extraNodesPath, [])
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
  }

  return BasePurgeCacheDirective
}
