/**
 * One `useState` per file, holding a single object typed by a local `State`
 * interface, destructured as `state` / `setState`:
 *
 *   interface State {
 *     query: string;
 *     declined: boolean;
 *   }
 *
 *   const [state, setState] = useState<State>({ query: '', declined: false });
 *
 * Scattered or loosely typed state hooks drift out of sync and hide what a
 * component actually holds. The shape always has a name, even when it holds
 * one field, so adding a second field never requires restructuring.
 */
const STATE_TYPE = 'State';

module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Require a single `useState<State>` per file' },
    schema: [],
    messages: {
      multiple:
        'Only one useState per file. Combine them into one object: interface State { … } and useState<State>({ … }).',
      untyped: 'useState needs an explicit type argument: useState<State>({ … }).',
      notStateInterface:
        'useState must be typed by a local `State` interface, even for a single field: interface State { … } and useState<State>({ … }).',
      naming: 'Destructure useState as `const [state, setState]`.',
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
        const [argument] = typeArguments?.params ?? [];

        if (!argument) {
          context.report({ node, messageId: 'untyped' });
        } else if (
          argument.type !== 'TSTypeReference' ||
          argument.typeName.type !== 'Identifier' ||
          argument.typeName.name !== STATE_TYPE
        ) {
          context.report({ node, messageId: 'notStateInterface' });
        }

        const declarator = node.parent;
        if (declarator?.type !== 'VariableDeclarator' || declarator.id.type !== 'ArrayPattern') {
          context.report({ node, messageId: 'naming' });
          return;
        }

        const [value, setter] = declarator.id.elements;
        const named = (element, expected) =>
          element?.type === 'Identifier' && element.name === expected;

        if (!named(value, 'state') || !named(setter, 'setState')) {
          context.report({ node, messageId: 'naming' });
        }
      },
    };
  },
};
