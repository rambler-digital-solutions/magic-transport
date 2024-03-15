type ArgumentTypes<F extends () => any> = F extends (...args: infer A) => any
  ? A
  : never

export type Promisify<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (...args: ArgumentTypes<T[K]>) => Promise<ReturnType<T[K]>>
    : Promisify<T[K]>
}
