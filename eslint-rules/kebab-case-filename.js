/**
 * Kebab-case file names, with the exceptions Expo Router needs: `_layout`,
 * `+not-found`, and `[param]` dynamic segments. A `.test` suffix is allowed.
 */
const ALLOWED = /^[+_]?(\[[a-z0-9-]+\]|[a-z0-9]+(-[a-z0-9]+)*)(\.test)?$/

module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Require kebab-case file names' },
    schema: [],
    messages: { casing: '"{{name}}" should be kebab-case.' },
  },
  create(context) {
    return {
      Program(node) {
        const base = context.filename.split('/').pop() ?? ''
        const name = base.replace(/\.(ts|tsx|js|jsx)$/, '')
        if (!ALLOWED.test(name)) {
          context.report({ node, messageId: 'casing', data: { name: base } })
        }
      },
    }
  },
}
