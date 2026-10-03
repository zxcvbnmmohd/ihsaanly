// Preloaded (./vite-shims.ts). TanStack Start's server functions need the server runtime's context. Tests
// call the handler itself: `createServerFn` here is the same builder chain,
// and the function it returns runs the handler with `{ data }` after
// validating it with the validator's own schema.
import { mock } from 'bun:test'

interface Schema {
  parse: (input: unknown) => unknown
}

mock.module('@tanstack/react-start', () => ({
  createServerFn: () => {
    let schema: Schema | null = null
    const builder = {
      validator: (given: Schema) => {
        schema = given
        return builder
      },
      middleware: () => builder,
      handler:
        <T>(run: (context: { data: never }) => T) =>
        ({ data }: { data: unknown }): Promise<T> =>
          Promise.resolve(run({ data: (schema ? schema.parse(data) : data) as never })),
    }
    return builder
  },
}))
mock.module('@tanstack/start-static-server-functions', () => ({ staticFunctionMiddleware: {} }))
