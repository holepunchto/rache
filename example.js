const GlobalCache = require('./index')

function main () {
  const cache = new GlobalCache()

  for (let i = 0; i < 100_000; i++) {
    cache.set(i, `value-${i}`)
  }

  for (let i = 0; i < 100; i++) {
    console.log('cache', i, cache.get(i))
  }
}

main()
