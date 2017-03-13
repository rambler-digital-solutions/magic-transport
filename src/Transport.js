import set from 'lodash/set'
import forOwn from 'lodash/forOwn'
import EventEmitter from 'events'
import forEachDeep from './utils/forEachDeep'
import { parse, stringify } from './utils/JSON'

export default class Transport {

  constructor(id, expectedOrigin, connectedWindow) {
    EventEmitter.call(this)
    this.expectedOrigin = expectedOrigin
    this.connectedWindow = connectedWindow
    this.functions = {}
    this.unpackedFunctions = {}
    this.i = 0
    this.onMessage = this.onMessage.bind(this)
    this.subscribeEvents()
    this.transportId = this.prepareTransportId(id)
    this.setMaxListeners(Infinity)
  }

  destroy() {
    this.unsubscribeEvents()
    this.functions = {}
    this.unpackedFunctions = {}
  }

  generateId() {
    return this.transportId + ':' + (++this.i)
  }

  subscribeEvents() {
    window.addEventListener('message', this.onMessage, true)
  }

  unsubscribeEvents() {
    window.removeEventListener('message', this.onMessage, true)
  }

  prepareTransportId(id) {
    return `MAGIC_TRANSPORT:${id}`
  }

  pack(object) {
    const functions = {}
    const checkedValues = []
    forEachDeep(object, (value, prop, subject, path) => {
      if (checkedValues.includes(value))
        return false
      if (typeof value === 'function') {
        let id = value.__magicTransportFunctionId
        if (!id) {
          id = this.generateId()
          Object.defineProperty(value, '__magicTransportFunctionId', {
            get() {
              return id
            }
          })
          this.functions[id] = (...args) =>
            new Promise((resolve, reject) => {
              try {
                Promise.resolve(value(...args)).then(resolve, reject)
              } catch (e) {
                reject(e)
              }
            })
        }
        functions[path] = id
      } else if (typeof value === 'object') {
        checkedValues.push(value)
      }
    })
    return functions
  }

  unpack(obj, functions) {
    forOwn(functions, (value, key) => {
      set(obj, key, this.unpackFunction(value))
    })
  }

  unpackFunction(functionId) {
    if (!this.unpackedFunctions[functionId])
      this.unpackedFunctions[functionId] = (...args) => (
        this.sendMessage({
          args,
          functionId,
          type: 'invoke',
          waitResponse: true
        }).then(({ response: { result } }) => result)
      )
    return this.unpackedFunctions[functionId]
  }

  sendMessage({ type, args = [], response = {}, responseToId, functionId, waitResponse }) {
    const id = this.generateId()
    const data = {
      [this.transportId]: {
        id,
        type,
        args,
        responseToId,
        functionId,
        response,
        functions: { ...this.pack(args), ...this.pack(response) },
        ts: Date.now()
      }
    }
    const pmargs = [stringify(data)]
    const origin = this.expectedOrigin && this.expectedOrigin !== '*' ? this.expectedOrigin : '*'
    if (origin)
      pmargs.push(origin)
    this.connectedWindow.postMessage(...pmargs)
    if (waitResponse)
      return this.waitResponse(id)
  }

  waitResponse(id) {
    return new Promise((resolve, reject) => {
      this.once(`response:${id}`, (data) => {
        const { response: { error } } = data
        if (error)
          reject(error)
        else
          resolve(data)
      })
    })
  }

  checkOrigin(origin) {
    return !this.expectedOrigin || this.expectedOrigin === '*' || origin === this.expectedOrigin
  }

  onMessage(event) {
    let { data } = event
    if (typeof data !== 'string' || !this.checkOrigin(event.origin))
      return
    try {
      data = parse(data)
    } catch (error) {
      data = {}
    }
    if (!data[this.transportId])
      return
    if (!this.connectedOrigin)
      this.connectedOrigin = event.origin
    this.handleMessage(data[this.transportId], event.source)
  }

  handleMessage(data, source) {
    const { type, args, functions, response } = data
    switch (type) {
    case 'invoke':
      this.unpack(args, functions)
      this.handleInvoke(data)
      break
    case 'response':
      this.unpack(response, functions)
      this.handleResponse(data)
      break
    case 'initialize':
      this.unpack(args, functions)
      this.handleInitialize && this.handleInitialize(data, source)
      break
    }
  }

  handleResponse(data) {
    const { responseToId } = data
    this.emit(`response:${responseToId}`, data)
  }

  handleInvoke({ functionId, args, id }) {
    const func = this.functions[functionId]
    new Promise((resolve, reject) => {
      try {
        Promise.resolve(func(...args)).then(resolve, (e) => {
          reject(e)
          throw e
        })
      } catch (e) {
        reject(e)
        throw e
      }
    }).then(
      (result) => (
        this.sendMessage({ type: 'response', response: { result }, responseToId: id })
      ),
      (error) => (
        this.sendMessage({ type: 'response', response: { error }, responseToId: id })
      )
    )
  }

}

Object.assign(Transport.prototype, EventEmitter.prototype)

