// file: src/debounce/use-debounce.ts
import { AnyFn, noop, DebounceFilterOptions, EventFilter, PromisifyFn, FunctionArgs, ArgumentsType } from './Models'

/**
 * Create an EventFilter that debounce the events
 */
export function debounceFilter(ms: number, options: DebounceFilterOptions = {}) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let maxTimer: ReturnType<typeof setTimeout> | undefined | null
  let lastRejector: AnyFn = noop

  const _clearTimeout = (timer: ReturnType<typeof setTimeout>) => {
    clearTimeout(timer)
    lastRejector()
    lastRejector = noop
  }

  const filter: EventFilter = (invoke) => {
    const duration = ms || 250
    const maxDuration = options.maxWait || 1000

    if (timer) _clearTimeout(timer)

    if (duration <= 0 || (maxDuration !== undefined && maxDuration <= 0)) {
      if (maxTimer) {
        _clearTimeout(maxTimer)
        maxTimer = null
      }
      return Promise.resolve(invoke())
    }

    return new Promise((resolve, reject) => {
      lastRejector = options.rejectOnCancel ? reject : resolve
      // Create the maxTimer. Clears the regular timer on invoke
      if (maxDuration && !maxTimer) {
        maxTimer = setTimeout(() => {
          if (timer) _clearTimeout(timer)
          maxTimer = null
          resolve(invoke())
        }, maxDuration)
      }

      // Create the regular timer. Clears the max timer on invoke
      timer = setTimeout(() => {
        if (maxTimer) _clearTimeout(maxTimer)
        maxTimer = null
        resolve(invoke())
      }, duration)
    })
  }

  return filter
}

/**
 * @internal
 */
export function createFilterWrapper<T extends AnyFn>(filter: EventFilter, fn: T) {
  function wrapper(this: any, ...args: ArgumentsType<T>) {
    return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      // make sure it's a promise
      Promise.resolve(filter(() => fn.apply(this, args), { fn, thisArg: this, args }))
        .then(resolve)
        .catch(reject)
    })
  }

  return wrapper
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
): PromisifyFn<T> {
  return createFilterWrapper(debounceFilter(ms || 250, options), fn)
}
