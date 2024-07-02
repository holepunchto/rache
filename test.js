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

test('subs share same cache, but no key conflicts', t => {
  const cache = new GlobalCache({ maxSize: 3 })
  const sub1 = cache.sub()
  const sub2 = cache.sub()

  sub1.set('key', 'value1')
  sub2.set('key', 'value2')

  t.is(cache.globalSize, 2, '2 entries')
  t.is(sub1.get('key'), 'value1', 'sub1 value')
  t.is(sub2.get('key'), 'value2', 'sub2 value')

  sub1.set('key2', 'value1')
  sub1.set('key3', 'value1')

  const entries = [sub1.get('key'), sub2.get('key'), sub1.get('key2'), sub1.get('key3')]
  const nrMisses = entries.filter(e => e === undefined).length
  t.is(nrMisses, 1, '1 entry got cleared from the global cache')
})

test('delete', t => {
  const cache = new GlobalCache()
  const sub = cache.sub()

  cache.set('key', 'value')
  cache.set('what', 'ever')
  sub.set('key', 'value')
  sub.set('what2', 'ever 2')

  t.is(cache.globalSize, 4, 'sanity check')
  t.is(cache.size, 2, 'sanity check')

  {
    const deleted = cache.delete('key')
    t.is(deleted, true, 'true when deleted')
  }

  t.is(cache.globalSize, 3, 'removed globally')
  t.is(cache.size, 1, 'removed locally')
  t.is(cache.get('key'), undefined, 'no entry')

  {
    const deleted = sub.delete('key')
    t.is(deleted, true, 'true when deleted')
  }

  t.is(sub.globalSize, 2, 'removed globally')
  t.is(sub.size, 1, 'removed locally')
  t.is(sub.get('key'), undefined, 'no entry')

  t.is(
    sub.delete('nothing here'),
    false,
    'false when nothing to delete'
  )
})

test('iterator', t => {
  const cache = new GlobalCache()
  const sub = cache.sub()

  cache.set('key', 'value')
  cache.set('key2', 'value2')
  sub.set('key', 'value')
  sub.set('what2', 'ever2')

  {
    const res = []
    const expected = [['key', 'value'], ['key2', 'value2']]
    for (const entry of cache) res.push(entry)
    t.alike(res, expected, 'iterator entries')
  }

  {
    const res = []
    const expected = [['key', 'value'], ['what2', 'ever2']]
    for (const entry of sub) res.push(entry)
    t.alike(res, expected, 'iterator entries')
  }
})

test('keys()', t => {
  const cache = new GlobalCache()
  const sub = cache.sub()

  cache.set('key', 'value')
  cache.set('key2', 'value2')
  sub.set('key', 'value')
  sub.set('what2', 'ever2')

  t.alike([...cache.keys()], ['key', 'key2'], 'expected keys')
  t.alike([...sub.keys()], ['key', 'what2'], 'expected keys')
})

test('values()', t => {
  const cache = new GlobalCache()
  const sub = cache.sub()

  cache.set('key', 'value')
  cache.set('key2', 'value2')
  sub.set('key', 'value')
  sub.set('what2', 'ever2')

  t.alike([...cache.values()], ['value', 'value2'], 'expected values')
  t.alike([...sub.values()], ['value', 'ever2'], 'expected values')
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
  if (cache.globalSize > cache.maxSize || cache.globalSize !== cache._array.length) throw new Error('size')

  for (const entry of cache._array) {
    const mapEntry = entry.map.get(entry.key)
    if (mapEntry.entry !== entry) throw new Error('different entry obj in map/cache')
  }

  for (const { entry } of cache._map.values()) {
    const arrayEntry = cache._array[entry.index]
    if (arrayEntry !== entry) throw new Error('different entry obj in map/cache')
  }
}
