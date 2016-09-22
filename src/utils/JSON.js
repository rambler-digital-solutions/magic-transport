const replaceErrors = (key, value) => {
  if (value instanceof Error) {
    const error = {}
    Object.getOwnPropertyNames(value).forEach((k) => {
      error[k] = value[k]
    })
    return error
  }
  return value
}

export const parse = JSON.parse.bind(JSON)

export const stringify = (obj) => JSON.stringify(obj, replaceErrors)
