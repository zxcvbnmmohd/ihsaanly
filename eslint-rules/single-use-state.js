/**
 * One `useState` per file, holding a single typed state object.
 *
 * Scattered `useState` calls drift out of sync and make a component's state
 * impossible to read in one place. The convention is:
 *
 *   interface State { query: string; declined: boolean }
 *   const [state, setState] = useState<State>({ query: '', declined: false });
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Require a single typed useState per file' },
    schema: [],
    messages: {
      multiple:
        'Only one useState per file. Combine them into one state object: interface State { … } and useState<State>({ … }).',
      untyped: 'useState needs an explicit type argument, e.g. useState<State>({ … }).',
    },
  },
  create(context) {
    let seen = 0;

    return {
      'CallExpression[callee.name="useState"]'(node) {
        seen += 1;
        if (seen > 1) {
          context.report({ node, messageId: 'multiple' });
          return;
        }
        const typeArguments = node.typeArguments ?? node.typeParameters;
        if (!typeArguments || typeArguments.params.length === 0) {
          context.report({ node, messageId: 'untyped' });
        }
      },
    };
  },
};
