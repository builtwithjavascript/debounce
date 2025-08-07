import { vi, describe, beforeEach, expect, it, Mock } from 'vitest'
import { useDebounce } from '../../use-debounce'

vi.useFakeTimers()

describe('useDebounce', () => {
  let func: Mock
  let debouncedFn: any // Use 'any' here to access .cancel and .flush
  let updated = 0
  let clicked = 0
  function onClicked() {
    clicked += 1
    debouncedFn()
  }

  beforeEach(() => {
    func = vi.fn(() => {
      updated += 1
    })
    // Now the returned object has .cancel and .flush, so we need to type it accordingly
    debouncedFn = useDebounce(func, 1000)
    updated = 0
    clicked = 0
  })

  it('execute just once', () => {
    for (let i = 0; i < 25; i++) {
      onClicked()
    }

    // Fast-forward time
    vi.runAllTimers()

    expect(func).toHaveBeenCalledTimes(1)
    expect(updated).toEqual(1)
    expect(clicked).toEqual(25)
  })

  it('cancel prevents execution', async () => {
    // Call the debounced function multiple times
    onClicked()
    onClicked()

    // Fast-forward time, but not enough to trigger the debounce
    vi.advanceTimersByTime(500)

    // Now, explicitly cancel the pending execution
    debouncedFn.cancel()

    // Fast-forward all remaining time
    vi.runAllTimers()

    // The function should not have been called because it was canceled
    expect(func).not.toHaveBeenCalled()
    expect(updated).toEqual(0)

    // Call the function again and let it run to confirm it's still working
    onClicked()
    await vi.runAllTimersAsync() // Use vi.runAllTimersAsync() for promise-based debounce
    expect(func).toHaveBeenCalledTimes(1)
    expect(updated).toEqual(1)
  })

  it('flush executes immediately and clears the timer', async () => {
    // Call the debounced function multiple times to set up the pending call
    onClicked()
    onClicked()

    // Fast-forward time a bit, but not enough to trigger the debounce
    vi.advanceTimersByTime(500)

    // Flush the pending execution.
    // The call to func() happens asynchronously, so we must await it.
    await debouncedFn.flush()

    // Crucially, we need to let the promise and all microtasks resolve.
    // vi.runAllTimersAsync() is the correct way to do this with fake timers.
    await vi.runAllTimersAsync()

    // The function should have been called immediately
    expect(func).toHaveBeenCalledTimes(1)
    expect(updated).toEqual(1)

    // Fast-forward the rest of the time to ensure it doesn't run again
    await vi.runAllTimersAsync()

    // The function should still only have been called once
    expect(func).toHaveBeenCalledTimes(1)
    expect(updated).toEqual(1)
  })

  it('flush returns undefined when nothing is pending', async () => {
    // No call → no timer
    const result = await debouncedFn.flush()
    expect(result).toBeUndefined()
    expect(func).not.toHaveBeenCalled()
  })

  it('rejects the promise when rejectOnCancel is true', async () => {
    debouncedFn = useDebounce(func, 1000, { rejectOnCancel: true })
    const p = debouncedFn()
    debouncedFn.cancel()
    await expect(p).rejects.toBeUndefined()
  })

  it('resolves with the return value of fn', async () => {
    const ret = Symbol()
    func = vi.fn(() => ret)
    debouncedFn = useDebounce(func, 1000)
    const p = debouncedFn()
    vi.runAllTimers()
    await expect(p).resolves.toBe(ret)
  })

  it('flush returns the function return value', async () => {
    const ret = 123
    func = vi.fn(() => ret)
    debouncedFn = useDebounce(func, 1000)
    debouncedFn()
    vi.advanceTimersByTime(500)
    const flushResult = await debouncedFn.flush()
    expect(flushResult).toBe(ret)
  })
})
