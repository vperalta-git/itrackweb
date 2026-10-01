// Share in-flight loads, but allow a new attempt after network/CSP failures.
export function createScriptLoader<T>(id: string, src: string, getGlobal: () => T | undefined, timeoutMs = 20000) {
  let pending: Promise<T> | null = null
  return function load(): Promise<T> {
    const ready = getGlobal()
    if (ready) return Promise.resolve(ready)
    if (pending) return pending
    pending = new Promise<T>((resolve, reject) => {
      document.getElementById(id)?.remove()
      const script = document.createElement('script')
      script.id = id
      script.src = src
      script.async = true
      const cleanup = () => {
        clearTimeout(timer)
        script.removeEventListener('load', onLoad)
        script.removeEventListener('error', onError)
      }
      const fail = (message: string) => {
        cleanup()
        script.remove()
        reject(new Error(message))
      }
      const onLoad = () => {
        const value = getGlobal()
        if (!value) { fail('Mapbox GL JS did not initialize.'); return }
        cleanup()
        resolve(value)
      }
      const onError = () => fail('Unable to load Mapbox GL JS. Check network access or browser content restrictions, then retry.')
      const timer = setTimeout(() => fail('Mapbox GL JS download timed out. Please retry.'), timeoutMs)
      script.addEventListener('load', onLoad)
      script.addEventListener('error', onError)
      document.body.appendChild(script)
    }).catch((error) => {
      pending = null
      throw error
    })
    return pending
  }
}
