// file: src/debounce/use-debounce.ts
import {
  AnyFn,
  noop,
  DebounceFilterOptions,
  EventFilter,
  FunctionArgs,
  ArgumentsType,
  DebouncedFnWithControl,
  Promisify
} from './Models'

/**
 * Create an EventFilter that debounce the events
 */
export function debounceFilter(ms: number, options: DebounceFilterOptions = {}) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let maxTimer: ReturnType<typeof setTimeout> | undefined | null
  let lastPromise: Promise<any> | undefined
  let lastRejector: AnyFn = noop

  const _clearTimeout = (timer: ReturnType<typeof setTimeout>) => {
    clearTimeout(timer)
    lastRejector()
    lastRejector = noop
  }

  const filter: EventFilter = (invoke) => {
    const duration = ms || 250
    const maxDuration = options.maxWait || 1000

    // Store a new promise for this invocation
    lastPromise = new Promise((resolve, reject) => {
      lastRejector = options.rejectOnCancel ? reject : resolve

      if (timer) _clearTimeout(timer)

      if (duration <= 0 || (maxDuration !== undefined && maxDuration <= 0)) {
        if (maxTimer) {
          _clearTimeout(maxTimer)
          maxTimer = null
        }
        resolve(invoke())
        return
      }

      if (maxDuration && !maxTimer) {
        maxTimer = setTimeout(() => {
          if (timer) _clearTimeout(timer)
          maxTimer = null
          resolve(invoke())
        }, maxDuration)
      }

      timer = setTimeout(() => {
        if (maxTimer) _clearTimeout(maxTimer)
        maxTimer = null
        resolve(invoke())
      }, duration)
    })

    return lastPromise
  }

  const cancel = () => {
    if (timer) _clearTimeout(timer)
    if (maxTimer) _clearTimeout(maxTimer)
    timer = maxTimer = undefined
    lastPromise = undefined
  }

  const flush = () => {
    if (timer) {
      _clearTimeout(timer)
      if (maxTimer) _clearTimeout(maxTimer)
      timer = maxTimer = undefined
      return lastPromise
    }
    return undefined
  }

  // Return an object containing the filter and control methods
  return { filter, cancel, flush }
}

/**
 * @internal
 */
export function createFilterWrapper<T extends AnyFn>(filterControl: ReturnType<typeof debounceFilter>, fn: T) {
  function wrapper(this: any, ...args: ArgumentsType<T>): Promisify<ReturnType<T>> {
    return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      Promise.resolve(filterControl.filter(() => fn.apply(this, args), { fn, thisArg: this, args }))
        .then(resolve)
        .catch(reject)
    })
  }

  const debounced = wrapper as DebouncedFnWithControl<T>
  debounced.cancel = filterControl.cancel
  debounced.flush = filterControl.flush

  return debounced
}

/**
 * Debounce execution of a function.
 *
 * @param  fn          A function to be executed after delay milliseconds debounced.
 * @param  ms          A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
 * @param  options     Options
 *
 * @return A new, debounce, function.
 */
export function useDebounce<T extends FunctionArgs>(
  fn: T,
  ms: number,
  options: DebounceFilterOptions = {}
): DebouncedFnWithControl<T> {
  // Use the new return type here
  return createFilterWrapper(debounceFilter(ms || 250, options), fn)
}
