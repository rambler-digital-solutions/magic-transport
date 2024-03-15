type Iterator<T> = (
  value: T,
  prop: number | string,
  subject: Record<string, any> | any[],
  path: string,
  level: number
) => boolean

interface IteratorOptions {
  path: string
  level: number
}

const forEachObject = <T>(
  object: Record<string, any>,
  fn: Iterator<T>,
  {path, level}: IteratorOptions
): void => {
  // need to iterate both own properties and prototype properties
  // eslint-disable-next-line sonar/for-in
  for (const key in object) {
    const deepPath = path ? `${path}.${key}` : key
    const result = fn.call(object, object[key], key, object, deepPath, level)

    if (result !== false) {
      forEach<T>(object[key], fn, {path: deepPath, level: level + 1})
    }
  }
}

const forEachArray = <T>(
  array: any[],
  fn: Iterator<T>,
  {path, level}: IteratorOptions
): void => {
  let deepPath = ''

  array.forEach((value, index, array) => {
    deepPath = path ? `${path}.${index}` : index.toString()

    const result = fn.call(array, value, index, array, deepPath, level)

    if (result !== false) {
      forEach<T>(array[index], fn, {path: deepPath, level: level + 1})
    }
  })
}

export const forEach = <T>(
  value: T,
  fn: Iterator<T>,
  {path = '', level = 0}: Partial<IteratorOptions> = {}
): void => {
  if (Array.isArray(value)) {
    forEachArray<T>(value, fn, {path, level})
  } else if (value && typeof value === 'object' && !(value instanceof Error)) {
    forEachObject<T>(value, fn, {path, level})
  }
}
