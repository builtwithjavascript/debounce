# @builtwithjavascript/debounce
Debounce function hook.



## Usage
```typescript
import { useDebounce } from '@builtwithjavascript/debounce'

const debouncedFn = useDebounce(() => {
  // do something
}, 350)

window.addEventListener('resize', debouncedFn)
```



With function type signature (TypeScript), when debugged function takes parameters:

```typescript
import { useDebounce } from '@builtwithjavascript/debounce'

const yourFunc = (yourFuncParams: TYourFuncParams) => {
  // ... do something
}
type TYourFunc = typeof yourFunc; // infer yourFunc type

const debouncedFn = useDebounce<TYourFunc>(yourFunc, 350)

const yourFuncParams = {}
debouncedFn(yourFuncParams)
```



You can also pass a 3rd parameter to this, with a maximum wait time, similar to lodash debounce:

```typescript
import { useDebounce } from '@builtwithjavascript/debounce'

// If no invokation after 5000ms due to repeated input,
// the function will be called anyway.
const debouncedFn = useDebounce(() => {
  // do something
}, 350, { maxWait: 5000 })

window.addEventListener('resize', debouncedFn)
```



Optionally, you can get the return value of the function using promise operations:

```typescript
import { useDebounce } from '@builtwithjavascript/debounce'

const debouncedRequest = useDebounce(() => 'response', 1000)

debouncedRequest().then((value) => {
  console.log(value) // 'response'
})

// or use async/await
async function doRequest() {
  const value = await debouncedRequest()
  console.log(value) // 'response'
}
```



## Credits

Code is from @vueuse npm package and used accordingly to the MIT license:
https://vueuse.org/shared/useDebounceFn/

