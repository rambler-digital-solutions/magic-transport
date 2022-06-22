import EventEmitter from 'events'
import {set} from 'dot-prop'
import {forEach} from './utils/for-each-deep'
import {parse, stringify} from './utils/json'

export interface Message {
  type: string
}

export interface Response {
  [key: string]: any
  result?: any
  error?: any
}

export type InvokingFunction = [number, string]

export interface Message {
  type: string
  id?: number
  args?: any[]
  response?: Response
  responseToId?: number
  functionToInvoke?: InvokingFunction
  functions?: Record<string, InvokingFunction>
  waitResponse?: boolean
}

export interface InvokeMessage extends Message {
  type: 'invoke'
  args: any[]
  functionToInvoke: InvokingFunction
  waitResponse: true
}

export interface ResponseMessage extends Message {
  type: 'response'
  response: Response
  responseToId: number
  waitResponse: true
}

export interface InitializeMessage extends Message {
  type: 'initialize'
  args: any[]
}

export type Received<T extends Message> = T & Required<Message>

export type PackingValue = PackingObject | PackingArray | PackingFunction

export interface PackingFunction {
  [key: string]: number
  (this: unknown, ...args: any[]): any
}

export interface PackingObject {
  [key: string]: PackingValue
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PackingArray extends Array<PackingValue> {}

export type CallerFunction = (...args: any[]) => Promise<any>

export type Context = Window | unknown

export interface TransportOptions {
  id: string,
  expectedOrigin: string,
  connectedWindow?: Window
}

export class Transport extends EventEmitter {
  protected connectedWindow?: Window
  private connectedOrigin?: string
  private expectedOrigin: string
  private functions: Record<
    string,
    (context: Context, args: any[]) => Promise<any>
  >
  private contexts: Record<string, Context>
  private unpackedFunctions: Record<string, CallerFunction>
  private i: number
  private transportId: string

  public constructor({
    id,
    expectedOrigin,
    connectedWindow
  }: TransportOptions) {
    super()
    this.expectedOrigin = expectedOrigin
    this.connectedWindow = connectedWindow
    this.functions = {}
    this.contexts = {}
    this.unpackedFunctions = {}
    this.i = 0
    this.subscribeEvents()
    this.transportId = this.prepareTransportId(id)
    this.setMaxListeners(Infinity)
  }

  public destroy(): void {
    this.unsubscribeEvents()
    this.functions = {}
    this.contexts = {}
    this.unpackedFunctions = {}
  }

  private generateId(): number {
    return ++this.i
  }

  private subscribeEvents(): void {
    window.addEventListener('message', this.onMessage, true)
  }

  private unsubscribeEvents(): void {
    window.removeEventListener('message', this.onMessage, true)
  }

  private prepareTransportId(id: string): string {
    return `MAGIC_TRANSPORT:${id}`
  }

  private pack(object: Record<string, any>): Record<string, InvokingFunction> {
    const functions: Record<string, InvokingFunction> = {}
    const checkedValues: PackingValue[] = []
    forEach<PackingValue>(
      object,
      (value: PackingValue, _, subject, path, level) => {
        if (checkedValues.indexOf(value) !== -1) return false
        if (typeof value === 'function') {
          const context = level === 0 ? window : subject
          const functionKey = `__${this.transportId}:functionId`
          let functionId = value[functionKey]
          if (!functionId) {
            functionId = this.generateId()
            Object.defineProperty(value, functionKey, {
              get() {
                return functionId
              }
            })
          }
          if (!this.functions[functionId])
            this.functions[functionId] = (ctx, args) =>
              new Promise((resolve, reject) => {
                try {
                  Promise.resolve(value.apply(ctx, args)).then(resolve, reject)
                } catch (e) {
                  reject(e)
                }
              })
          const contextKey = `__${this.transportId}:contextId`
          let contextId = context[contextKey]
          if (!contextId) {
            contextId = this.generateId()
            Object.defineProperty(context, contextKey, {
              get() {
                return contextId
              }
            })
          }
          if (!this.contexts[contextId]) this.contexts[contextId] = context
          functions[path] = [functionId, contextId]
        } else if (typeof value === 'object') {
          checkedValues.push(value)
        }
        return true
      }
    )
    return functions
  }

  private unpack(
    object: PackingObject | PackingArray,
    functions?: Record<string, InvokingFunction>
  ): void {
    for (const key in functions)
      if (functions.hasOwnProperty(key))
        set(object, key, this.unpackFunction(functions[key]))
  }

  private unpackFunction(value: InvokingFunction): CallerFunction {
    const [functionId, contextId] = value
    const key = `${functionId}|${contextId}`
    if (!this.unpackedFunctions[key])
      this.unpackedFunctions[key] = (...args) => {
        const message: InvokeMessage = {
          args,
          functionToInvoke: value,
          type: 'invoke',
          waitResponse: true
        }
        return this.sendMessage(message).then(({response: {result}}) => result)
      }
    return this.unpackedFunctions[key]
  }

  protected sendMessage(message: ResponseMessage): Promise<ResponseMessage>
  protected sendMessage(message: InvokeMessage): Promise<ResponseMessage>
  protected sendMessage(message: InitializeMessage): Promise<ResponseMessage>
  protected sendMessage(message: Message): void

  protected sendMessage(
    message: Message | InvokeMessage | ResponseMessage | InitializeMessage
  ): void | Promise<ResponseMessage> {
    const {
      type,
      args = [],
      response = {},
      responseToId,
      functionToInvoke,
      waitResponse
    } = message
    const id = this.generateId()
    const data = {
      [this.transportId]: {
        id,
        type,
        args,
        responseToId,
        functionToInvoke,
        response,
        functions: {...this.pack(args), ...this.pack(response)},
        ts: Date.now()
      }
    }
    const origin =
      this.expectedOrigin && this.expectedOrigin !== '*'
        ? this.expectedOrigin
        : '*'
    this.connectedWindow?.postMessage(stringify(data), origin)
    if (waitResponse) return this.waitResponse(id)
  }

  private waitResponse(id: number): Promise<ResponseMessage> {
    return new Promise((resolve, reject) => {
      this.once(`response:${id}`, (data) => {
        const {
          response: {error}
        } = data
        if (error) reject(error)
        else resolve(data)
      })
    })
  }

  private checkOrigin(origin: string): boolean {
    return (
      !this.expectedOrigin ||
      this.expectedOrigin === '*' ||
      origin === this.expectedOrigin
    )
  }

  private onMessage = (event: MessageEvent): void => {
    let {data} = event
    if (typeof data !== 'string' || !this.checkOrigin(event.origin)) return
    try {
      data = parse(data)
    } catch (error) {
      data = {}
    }
    if (!data[this.transportId]) return
    if (!this.connectedOrigin) this.connectedOrigin = event.origin
    this.handleMessage(
      data[this.transportId],
      (event.source as Window) || undefined
    )
  }

  private handleMessage(data: Received<InvokeMessage>, source?: Window): void
  private handleMessage(data: Received<ResponseMessage>, source?: Window): void
  private handleMessage(
    data: Received<InitializeMessage>,
    source?: Window
  ): void

  private handleMessage(
    data: Received<InvokeMessage | ResponseMessage | InitializeMessage>,
    source?: Window
  ): void {
    switch (data.type) {
      case 'invoke':
        this.unpack(data.args, data.functions)
        this.handleInvoke(data)
        break
      case 'response':
        this.unpack(data.response, data.functions)
        this.handleResponse(data)
        break
      case 'initialize':
        this.unpack(data.args, data.functions)
        this.handleInitialize && this.handleInitialize(data, source)
        break
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected handleInitialize(
    _data: Received<InitializeMessage>,
    _source?: Window
  ): void {}

  private handleResponse(data: Received<ResponseMessage>): void {
    const {responseToId} = data
    this.emit(`response:${responseToId}`, data)
  }

  private handleInvoke({
    functionToInvoke,
    args,
    id
  }: Received<InvokeMessage>): void {
    const [functionId, contextId] = functionToInvoke
    const func = this.functions[functionId]
    const context = this.contexts[contextId]
    new Promise((resolve, reject) => {
      try {
        Promise.resolve(func(context, args)).then(resolve, (e) => {
          reject(e)
          throw e
        })
      } catch (e) {
        reject(e)
        throw e
      }
    }).then(
      (result) =>
        this.sendMessage({
          type: 'response',
          response: {result},
          responseToId: id
        }),
      (error) =>
        this.sendMessage({
          type: 'response',
          response: {error},
          responseToId: id
        })
    )
  }
}
