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
    this.links = {}
    this.i = 0
    this.onMessage = this.onMessage.bind(this)
    this.subscribeEvents()
    this.transportId = this.prepareTransportId(id)
    this.setMaxListeners(Infinity)
  }

  destroy() {
    this.unsubscribeEvents()
    this.links = {}
  }

  generateId() {
    return ++this.i
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

  link(object) {
    const links = {}
    const checkedValues = []
    forEachDeep(object, (value, prop, subject, path) => {
      if (checkedValues.includes(value))
        return false
      if (typeof value === 'function') {
        const id = this.generateId()
        links[path] = id
        this.links[id] = (...args) =>
          new Promise((resolve, reject) => {
            try {
              Promise.resolve(value.call(subject, ...args)).then(resolve, reject)
            } catch (e) {
              reject(e)
            }
          })
      } else if (typeof value === 'object') {
        checkedValues.push(value)
      }
    })
    return links
  }

  unlink(linkedArgs, links) {
    forOwn(links, (value, key) => {
      set(linkedArgs, key, (...args) => (
        this.sendMessage({
          args,
          type: 'invoke',
          functionId: value,
          waitResponse: true
        }).then(({ response: { result } }) => result)
      ))
    })
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
        links: { ...this.link(args), ...this.link(response) },
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
    const { type, args, links, response } = data
    switch (type) {
    case 'invoke':
      this.unlink(args, links)
      this.handleInvoke(data)
      break
    case 'response':
      this.unlink(response, links)
      this.handleResponse(data)
      break
    case 'initialize':
      this.unlink(args, links)
      this.handleInitialize && this.handleInitialize(data, source)
      break
    }
  }

  handleResponse(data) {
    const { responseToId } = data
    this.emit(`response:${responseToId}`, data)
  }

  handleInvoke({ functionId, args, id }) {
    const func = this.links[functionId]
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

