// An in-memory expo-file-system, one entry per file name, with both the async
// and the sync read and write the widget stores use. `files.unreadable` makes
// every read throw.
export const files = {
  contents: new Map<string, string>(),
  unreadable: false,
  /** The directory the last file was opened in. */
  dir: '',
}

export function fileSystemModule(): Record<string, unknown> {
  return {
    Paths: { document: 'file:///documents', cache: 'file:///cache' },
    File: class {
      constructor(
        readonly dir: string,
        readonly name: string,
      ) {
        files.dir = dir
      }
      get exists(): boolean {
        return files.contents.has(this.name)
      }
      textSync(): string {
        if (files.unreadable) throw new Error('unreadable')
        return files.contents.get(this.name) ?? ''
      }
      writeSync(contents: string): void {
        files.contents.set(this.name, contents)
      }
      async text(): Promise<string> {
        return this.textSync()
      }
      async write(contents: string): Promise<void> {
        this.writeSync(contents)
      }
    },
  }
}
