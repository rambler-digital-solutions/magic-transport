import forIn from 'lodash/forIn'

function forEachObject(obj, fn, path) {
  forIn(obj, (v, key) => {
    const deepPath = path ? path + '.' + key : key
    const result = fn.call(obj, obj[key], key, obj, deepPath)
    if (result !== false)
      forEach(obj[key], fn, deepPath)
  })
}

function forEachArray(array, fn, path) {
  let deepPath = ''

  array.forEach((value, index, arr) => {
    deepPath = path + '[' + index + ']'
    const result = fn.call(arr, value, index, arr, deepPath)
    if (result !== false)
      forEach(arr[index], fn, deepPath)
  })
}

export default function forEach(value, fn, path) {
  path = path || ''

  if (Array.isArray(value))
    forEachArray(value, fn, path)
  else if (value && typeof value === 'object' && !(value instanceof Error))
    forEachObject(value, fn, path)
}
