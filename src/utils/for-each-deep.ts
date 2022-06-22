export type Iterator<T> = (
  value: T,
  prop: number | string,
  subject: Record<string, any> | any[],
  path: string,
  level: number
) => boolean

const forEachObject = <T>(
  object: Record<string, any>,
  fn: Iterator<T>,
  path: string,
  level: number
): void => {
  for (const key in object) {
    const deepPath = path ? path + '.' + key : key
    const result = fn.call(object, object[key], key, object, deepPath, level)
    if (result !== false) forEach<T>(object[key], fn, deepPath, level + 1)
  }
}

const forEachArray = <T>(
  array: any[],
  fn: Iterator<T>,
  path: string,
  level: number
): void => {
  let deepPath = ''
  array.forEach((value, index, array) => {
    deepPath = path ? path + '.' + index : index.toString()
    const result = fn.call(array, value, index, array, deepPath, level)
    if (result !== false) forEach<T>(array[index], fn, deepPath, level + 1)
  })
}

export const forEach = <T>(
  value: T,
  fn: Iterator<T>,
  path?: string,
  level = 0
): void => {
  path = path || ''
  if (Array.isArray(value)) forEachArray<T>(value, fn, path, level)
  else if (value && typeof value === 'object' && !(value instanceof Error))
    forEachObject<T>(value, fn, path, level)
}
