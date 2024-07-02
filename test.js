const test = require('brittle')
const GlobalCache = require('.')

test('basic set and get', t => {
  const cache = new GlobalCache()
  cache.set('key', 'value')
  t.is(cache.get('key'), 'value', 'correct value')
})

test('set of existing value', t => {
  const cache = new GlobalCache()
  cache.set('key', 'value')
  t.is(cache.get('key'), 'value', 'sanity check')

  cache.set('key', 'new')
  t.is(cache.get('key'), 'new', 'updated value')
  t.is(cache.size, 1, 'correct size')
})

test('gc triggers when full and removes 1 entry', t => {
  const cache = new GlobalCache({ maxSize: 3 })
  cache.set('key', 'value')
  cache.set('key2', 'value2')
  cache.set('key3', 'value3')

  t.is(cache.size, 3, 'sanity check')

  cache.set('key4', 'value4')
  t.is(cache.size, 3, 'cache did not grow past maxSize')
  const values = [cache.get('key'), cache.get('key2'), cache.get('key3')]

  const nrMisses = values.filter(v => v === undefined).length
  t.is(nrMisses, 1, 'exactly 1 old item got removed from the cache')
})

test('subs share same cache, but no key confllicts', t => {
  const cache = new GlobalCache({ maxSize: 3 })
  const sub1 = cache.sub('sub1')
  const sub2 = cache.sub('sub2')

  sub1.set('key', 'value1')
  sub2.set('key', 'value2')

  t.is(cache.size, 2, '2 entries')
  t.is(sub1.get('key'), 'value1', 'sub1 value')
  t.is(sub2.get('key'), 'value2', 'sub2 value')

  sub1.set('key2', 'value1')
  sub1.set('key3', 'value1')

  const entries = [sub1.get('key'), sub2.get('key'), sub1.get('key2'), sub1.get('key3')]
  const nrMisses = entries.filter(e => e === undefined).length
  t.is(nrMisses, 1, '1 entry got cleared from the global cache')
})

test('internal structure remains consistent', t => {
  const cache = new GlobalCache({ maxSize: 3 })

  for (let i = 0; i < 1000; i++) {
    cache.set(`key${i}`, `value${i}`)
    if (i > 100) cache.set(`key${i - 50}`, 'updated')

    ensureConsistent(cache)
  }
})

function ensureConsistent (cache) {
  if (cache.size > cache.maxSize || cache.size !== cache._array.length) throw new Error('size')

  if (cache._array.length !== cache._map.size) throw new Error('array/map discrepancy')

  for (const entry of cache._array) {
    const mapEntry = cache._map.get(entry.key)
    if (mapEntry !== entry) throw new Error('different entry obj in map/cache')
  }

  for (const entry of cache._map.values()) {
    const arrayEntry = cache._array[entry.index]
    if (arrayEntry !== entry) throw new Error('different entry obj in map/cache')
  }
}
