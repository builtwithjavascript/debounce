import { vi, Mock } from 'vitest'
import { useDebounce } from '../../use-debounce'

vi.useFakeTimers()

describe('useDebounce', () => {
  let func: Mock
  let debouncedFn: Function
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

    // updated should be one, even after invoking onClicked 25 times
    expect(updated).toEqual(1)
    expect(clicked).toEqual(25)
  })
})
