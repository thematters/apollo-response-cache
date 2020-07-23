/*
 * Full query response cache
 *
 * | key         | value                         |
 * | fqc:47ea290 | {"data":{"viewer":{"id": ...} |
 * | fqc:7191828 | {"data":{"viewer":{"id": ...} |
 *
 * @see {@url https://github.com/apollographql/apollo-server/pull/2437/files}
 */
export const CACHE_KEY_PREFIX_FQC = 'fqc:'

/**
 * Node and FQC hashes array mapping
 *
 * | key                  | value                  |
 * | node-fqcs:Article:18 | ["47ea290", "7191828"] |
 *
 */
export const CACHE_KEY_PREFIX_NODE_FQC = 'node-fqcs'
