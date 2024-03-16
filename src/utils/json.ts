const replaceErrors = (_: string, value: any): any => {
  if (value instanceof Error) {
    const error: Record<string, any> = {}

    Object.getOwnPropertyNames(value).forEach((key: string) => {
      error[key] = value[key as keyof Error]
    })

    return error
  }

  return value
}

export const parse = JSON.parse.bind(JSON)

export const stringify = (object: Record<string, any>): string =>
  JSON.stringify(object, replaceErrors)
