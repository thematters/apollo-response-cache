import { defaultFieldResolver, GraphQLField } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'
import { get } from 'lodash'

import { invalidateFQC, Node } from '../utils'

interface PurgeCacheDirectiveProps {
  // The path to get extra nodes from result.
  extraNodesPath?: string
  // Custom function to resolve node type
  typeResolver?: (type: string, node: any) => string
}

export const PurgeCacheDirective = ({
  extraNodesPath,
  typeResolver,
}: PurgeCacheDirectiveProps): typeof SchemaDirectiveVisitor => {
  class BasePurgeCacheDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>): void {
      const { resolve = defaultFieldResolver } = field
      const { type, identifier } = this.args

      field.resolve = async function (...args) {
        const [root, _, { __redis }] = args
        const result = await resolve.apply(this, args)

        const nodeType = typeResolver ? typeResolver(type, result) : type
        const nodeId =
          get(result, identifier) || get(result, 'id') || get(result, '_id')
        const defaultNode = { id: nodeId, type: nodeType }

        const shouldPurgeCache = __redis && nodeType && nodeId
        if (!shouldPurgeCache) {
          return result
        }

        const extraNodes = extraNodesPath ? get(result, extraNodesPath, []) : []
        const nodes: Node[] = [...extraNodes, defaultNode]
        nodes.map((node) => {
          if (!node) {
            return
          }

          invalidateFQC({ node, redis: __redis })
        })

        return result
      }
    }
  }

  return BasePurgeCacheDirective
}
