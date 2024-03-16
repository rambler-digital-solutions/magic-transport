import {EventEmitter} from 'events'
import {Consumer, Provider} from '.'

const IFRAME_ORIGIN = '*'

describe('Transport', () => {
  let windowMock: any
  let frameMock: any
  let windowSpy: jest.SpyInstance
  let frameSpy: jest.SpyInstance

  beforeEach(() => {
    windowMock = {
      events: new EventEmitter(),
      addEventListener(event: string, listener: any) {
        this.events.on(event, listener)
      },
      postMessage(data: any, origin: string) {
        const event = new MessageEvent('message', {
          data,
          origin,
          source: frameMock
        })

        setTimeout(() => this.events.emit('message', event), 0)
      }
    }

    frameMock = {
      events: new EventEmitter(),
      addEventListener(event: string, listener: any) {
        this.events.on(event, listener)
      },
      postMessage(data: any, origin: string) {
        const event = new MessageEvent('message', {
          data,
          origin,
          source: windowMock
        })

        setTimeout(() => this.events.emit('message', event), 0)
      }
    }
  })

  it('should initialize transport', async () => {
    const id = 'uniq-channel-1'

    windowSpy = jest
      .spyOn(global, 'window', 'get')
      .mockImplementation(() => windowMock)

    const provider = new Provider({
      id,
      parentOrigin: IFRAME_ORIGIN
    })

    windowSpy.mockRestore()

    frameSpy = jest.spyOn(global, 'window', 'get').mockImplementation(() => ({
      ...frameMock,
      parent: windowMock
    }))

    const consumer = new Consumer({
      id,
      childOrigin: IFRAME_ORIGIN
    })

    await Promise.all(
      [provider, consumer].map(
        (transport) =>
          new Promise((resolve) => transport.once('ready', resolve))
      )
    )

    expect((provider as any).connectedOrigin).toBe(IFRAME_ORIGIN)
    expect((consumer as any).connectedOrigin).toBe(IFRAME_ORIGIN)
  })

  it('should call facade methods', async () => {
    const id = 'uniq-channel-2'

    interface ProviderFacade {
      hello: {
        from: {
          provider(): string
        }
      }
      echo(message: string): string
    }

    interface ConsumerFacade {
      hello: {
        from: {
          consumer(): string
        }
      }
      echo(message: string): Promise<string>
    }

    windowSpy = jest
      .spyOn(global, 'window', 'get')
      .mockImplementation(() => windowMock)

    const provider = new Provider<ProviderFacade, ConsumerFacade>({
      id,
      childOrigin: IFRAME_ORIGIN,
      hello: {
        from: {
          provider() {
            return 'hello from provider'
          }
        }
      },
      echo(message: string) {
        return message
      }
    })

    windowSpy.mockRestore()

    frameSpy = jest.spyOn(global, 'window', 'get').mockImplementation(() => ({
      ...frameMock,
      parent: windowMock
    }))

    const consumer: Consumer<ProviderFacade, ConsumerFacade> = new Consumer<
      ProviderFacade,
      ConsumerFacade
    >({
      id,
      parentOrigin: IFRAME_ORIGIN,
      hello: {
        from: {
          consumer() {
            return 'hello from consumer'
          }
        }
      },
      echo(message: string) {
        return consumer.provider.echo(message)
      }
    })

    await Promise.all(
      [provider, consumer].map(
        (transport) =>
          new Promise((resolve) => transport.once('ready', resolve))
      )
    )

    const providerResult = await consumer.provider.hello.from.provider()
    const consumerResult = await provider.consumer.hello.from.consumer()
    const echoResult = await provider.consumer.echo('hello from test')

    expect(providerResult).toBe('hello from provider')
    expect(consumerResult).toBe('hello from consumer')
    expect(echoResult).toBe('hello from test')
  })

  it('should fire events', async () => {
    const id = 'uniq-channel-3'

    windowSpy = jest
      .spyOn(global, 'window', 'get')
      .mockImplementation(() => windowMock)

    const provider = new Provider({
      id,
      childOrigin: IFRAME_ORIGIN
    })

    windowSpy.mockRestore()

    frameSpy = jest.spyOn(global, 'window', 'get').mockImplementation(() => ({
      ...frameMock,
      parent: windowMock
    }))

    const consumer = new Consumer({
      id,
      parentOrigin: IFRAME_ORIGIN
    })

    await Promise.all(
      [provider, consumer].map(
        (transport) =>
          new Promise((resolve) => transport.once('ready', resolve))
      )
    )

    const consumerEvent = await new Promise((resolve) => {
      consumer.consumer.once('my_event', resolve)
      provider.consumer.emit('my_event', {foo: 'bar'})
    })

    expect(consumerEvent).toEqual({foo: 'bar'})

    const providerEvent = await new Promise((resolve) => {
      provider.provider.once('custom_event', resolve)
      consumer.provider.emit('custom_event', {bar: 'baz'})
    })

    expect(providerEvent).toEqual({bar: 'baz'})
  })

  afterEach(() => {
    frameSpy.mockRestore()
  })
})
