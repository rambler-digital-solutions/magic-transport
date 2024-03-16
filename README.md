# Magic Transport

Transport for communication between iframe and parent window

## Install

```sh
npm install magic-transport
```

or

```sh
yarn add magic-transport
```

## Usage

### Base example

Insert the following code on the page where the `iframe` is embeded (`provider` page):

```ts
import {Provider} from 'magic-transport'

const id = 'UNIQ_ID'
const childOrigin = '*'
const sharedObject = {
  hello: {
    from: {
      provider() {
        return 'hello from provider'
      }
    }
  }
}

const transport = new Provider({id, childOrigin, ...sharedObject})

transport.once('ready', async () => {
  const consumerResult = await transport.consumer.hello.from.consumer()

  console.log(consumerResult) // 'hello from provider'

  transport.consumer.timeout((result) => {
    console.log(result) // 'hello from consumer'
  }, 1000)

  transport.consumer.on('my_event', (result) => {
    console.log(result) // {foo: 'bar'}
  })
})
```

Insert the following code on the page loaded in the `iframe` (`consumer` page):

```ts
import {Consumer} from 'magic-transport'

const id = 'UNIQ_ID'
const parentOrigin = '*'
const sharedObject = {
  hello: {
    from: {
      consumer() {
        return transport.provider.hello.from.provider()
      }
    }
  },
  timeout(callback, timeout) {
    setTimeout(() => {
      callback('hello from consumer')
    }, timeout)
  }
}

const transport = new Consumer({id, parentOrigin, ...sharedObject})

transport.once('ready', () => {
  transport.consumer.emit('my_event', {foo: 'bar'})
})
```

Both `Consumer` and `Provider` interfaces can return any values, which will be resolved as a Promise. Passed callbacks will be called as well.

### Connecting to any window or `iframe`

```ts
import {Provider} from 'magic-transport'

const id = 'UNIQ_ID'
const childOrigin = '*'
const sharedObject = {
  hello: {
    from: {
      provider: function () {
        return 'hello from provider'
      }
    }
  }
}

const iframe = document.createElement('iframe')
iframe.src = 'https://site.app/embed'
document.body.appendChild(iframe)

const transport = new Provider({
  id,
  childOrigin,
  connectedWindow: iframe.contentWindow,
  ...sharedObject
});
```

## Documentation

Currently we only have the API which you can check [here](https://rambler-digital-solutions.github.io/magic-transport/).

## Contributing

### Start

After you clone the repo you just need to run [`yarn`](https://yarnpkg.com/lang/en/docs/cli/#toc-default-command)'s default command to install and build the packages

```
yarn
```

### Testing

We have a test suite consisting of a bunch of unit tests to verify utils keep working as expected. Test suit is run in CI on every commit.

To run the tests

```
yarn test
```

To run the tests in watch mode

```sh
yarn test:watch
```

### Code quality

To run linting the codebase

```sh
yarn lint
```

To check typings

```sh
yarn typecheck
```

To check bundle size

```sh
yarn sizecheck
```

## Discussion

Please open an issue if you have any questions or concerns.

## License

MIT
