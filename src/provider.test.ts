import {Provider} from './provider'

Object.defineProperty(window, 'postMessage', {
  value: jest.fn()
})

describe('Provider', () => {
  it('should initialize correctly', () => {
    const provider = new Provider({
      id: 'testId',
      expectedOrigin: '*',
      connectedWindow: window,
      facade: {}
    })

    expect(provider.provider).toBeDefined()
    expect(provider.facade).toBeDefined()
  })

  it('should handle initialize message', async () => {
    const onReady = jest.fn()

    const provider = new Provider({
      id: 'testId',
      expectedOrigin: '*',
      connectedWindow: window,
      facade: {}
    })

    provider.on('ready', onReady)

    const message = {
      type: 'initialize',
      args: ['consumerInterface'],
      waitResponse: true
    }

    const promise = (provider as any).handleInitialize(message, window)

    provider.emit(`response:1`, {response: {result: [window]}})
    await promise

    expect(provider.consumer).toBeDefined()
    expect(onReady).toHaveBeenCalled()
    expect(window.postMessage).toHaveBeenCalled()
  })
})
