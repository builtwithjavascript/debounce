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
 * Create an EventFilter that debounces the events,
 * and exposes cancel() + flush().
 */
export function debounceFilter(ms: number, options: DebounceFilterOptions = {}) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let maxTimer: ReturnType<typeof setTimeout> | undefined
  let lastPromise: Promise<any> | undefined
  let lastRejector: AnyFn = noop
  let lastInvoker: (() => void) | undefined

  // only clears the timer—does NOT resolve/reject the promise
  const clearTimerOnly = (t: ReturnType<typeof setTimeout>) => {
    clearTimeout(t)
  }

  const filter: EventFilter = (invoke, _opts) => {
    const duration = ms || 250
    // only fire a max-wait if the user explicitly set options.maxWait
    const maxDuration = options.maxWait != null ? options.maxWait : Infinity

    lastPromise = new Promise((resolve, reject) => {
      // we only reject on cancel if the user opted in
      lastRejector = options.rejectOnCancel ? reject : noop

      // this is the one true “call my function & resolve the promise”
      lastInvoker = () => {
        if (timer) clearTimerOnly(timer)
        if (maxTimer) clearTimerOnly(maxTimer)
        timer = maxTimer = undefined
        resolve(invoke())
      }

      // immediate path
      if (duration <= 0 || maxDuration <= 0) {
        lastInvoker()
        return
      }

      // schedule a max-wait only if finite
      if (maxDuration < Infinity && !maxTimer) {
        maxTimer = setTimeout(() => {
          lastInvoker!()
          maxTimer = undefined
        }, maxDuration)
      }

      // reset the normal debounce timer
      if (timer) clearTimerOnly(timer)
      timer = setTimeout(() => {
        lastInvoker!()
      }, duration)
    })

    return lastPromise
  }

  const cancel = () => {
    if (timer) clearTimerOnly(timer)
    if (maxTimer) clearTimerOnly(maxTimer)
    timer = maxTimer = undefined

    // this is a user-triggered cancel: reject or resolve
    lastRejector()
    lastRejector = noop

    lastPromise = undefined
    lastInvoker = undefined
  }

  const flush = (): Promise<any> | undefined => {
    if (timer && lastInvoker) {
      clearTimerOnly(timer)
      if (maxTimer) clearTimerOnly(maxTimer)
      timer = maxTimer = undefined
      lastInvoker()
      return lastPromise
    }
    return undefined
  }

  return { filter, cancel, flush }
}

/**
 * Wraps your function `fn` with that filter,
 * and exposes cancel() + flush() on the returned wrapper.
 */
export function createFilterWrapper<T extends AnyFn>(filterControl: ReturnType<typeof debounceFilter>, fn: T) {
  function wrapper(this: any, ...args: ArgumentsType<T>): Promisify<ReturnType<T>> {
    return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      Promise.resolve(filterControl.filter(() => fn.apply(this, args), { fn, thisArg: this, args })).then(
        resolve,
        reject
      )
    })
  }

  const debounced = wrapper as DebouncedFnWithControl<T>
  debounced.cancel = filterControl.cancel
  debounced.flush = filterControl.flush

  return debounced
}

/**
 * Public API:
 *
 * const db = useDebounce(myFn, 1000)
 * db()                // schedules
 * db.cancel()         // cancels & rejects (if rejectOnCancel)
 * const val = await db.flush()  // forces immediate invoke, returns fn’s return
 */
export function useDebounce<T extends FunctionArgs>(
  fn: T,
  ms: number,
  options: DebounceFilterOptions = {}
): DebouncedFnWithControl<T> {
  return createFilterWrapper(debounceFilter(ms, options), fn)
}
