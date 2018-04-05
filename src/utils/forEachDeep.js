function forEachObject(obj, fn, path, level) {
  for (const key in obj) {
    const deepPath = path ? path + '.' + key : key
    const result = fn.call(obj, obj[key], key, obj, deepPath, level)
    if (result !== false)
      forEach(obj[key], fn, deepPath, level + 1)
  }
}

function forEachArray(array, fn, path, level) {
  let deepPath = ''

  array.forEach((value, index, arr) => {
    deepPath = path + '.' + index
    const result = fn.call(arr, value, index, arr, deepPath, level)
    if (result !== false)
      forEach(arr[index], fn, deepPath, level + 1)
  })
}

export default function forEach(value, fn, path, level = 0) {
  path = path || ''

  if (Array.isArray(value))
    forEachArray(value, fn, path, level)
  else if (value && typeof value === 'object' && !(value instanceof Error))
    forEachObject(value, fn, path, level)
}
