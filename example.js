const Rache = require('.')

const cache = new Rache({ maxSize: 3 })
const cache2 = cache.sub()
const cache3 = cache.sub()

cache.set('key', 'value')
cache2.set('key', 'otherValue')
cache3.set('some', 'thing')

// cache 1 is a separate cache from cache2 and cache3
console.log('cached:', cache.get('key')) // 'value'

// But they share the same global size
console.log(cache.globalSize, 'of', cache.maxSize) // 3 of 3

cache.set('key2', 'another value')
// The cache was full, so one of the existing 3 entries got evicted

console.log(cache.globalSize, 'of', cache.maxSize) // 3 of 3
