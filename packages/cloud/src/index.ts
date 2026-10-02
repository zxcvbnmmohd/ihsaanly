// Provider-agnostic surface: no Firebase import here, so loading this never
// pulls the SDK. The provider swap point is the `create…Cloud` functions in
// `firebase/flows/<platform>` — apps import `@ihsaanly/cloud/firebase/flows/web`,
// `…/extension` or `…/native` and nothing else from `firebase/`.
export * from './engine'
export * from './ports'
