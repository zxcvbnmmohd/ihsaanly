/**
 * Named exports everywhere except Expo Router routes, which require a default.
 *
 * A default export renames silently, resists autocomplete, and makes grep lie
 * about where a symbol is used.
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Forbid default exports outside routes' },
    schema: [],
    messages: {
      noDefault: 'Use a named export. Only files in src/app/ may export default.',
    },
  },
  create(context) {
    return {
      ExportDefaultDeclaration(node) {
        context.report({ node, messageId: 'noDefault' })
      },
    }
  },
}
