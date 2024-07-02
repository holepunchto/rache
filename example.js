const GlobalCache = require('./index')

function main () {
  const cache = new GlobalCache()

  const fork = 0

  for (let i = 0; i < 100_000; i++) {
    cache.set(i, fork, `value-${i}`)
  }

  for (let i = 0; i < 100; i++) {
    console.log('cache', i, cache.get(i, fork))
  }

  console.log('other fork always cache misses', cache.get(0, 1))
}

main()
