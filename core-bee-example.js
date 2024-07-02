const hypCrypt = require('hypercore-crypto')
const idEnc = require('hypercore-id-encoding')
const GlobalCache = require('.')

async function main () {
  // To verify there is no arbitrary memory growth, set many blocks and a large nrCores
  // => 'Heap used' stays bound. Increasing maxSize increases the total heap usage
  const maxSize = 65536
  const globalCache = new GlobalCache({ maxSize })
  const nrCores = 7
  const nrBees = 7
  const nrBlocks = 5000

  const cores = []
  for (let i = 0; i < nrCores; i++) {
    const core = new Hypercore(globalCache)
    for (let j = 0; j < nrBlocks; j++) core.append()
    cores.push(core)
    console.log('created core', i, getHeapMb())
  }

  console.log('creating bees')
  const bees = []
  for (let i = 0; i < nrBees; i++) {
    const bee = new Hyperbee(new Hypercore(globalCache), globalCache)
    for (let j = 0; j < nrBlocks; j++) bee.put(`entry-${j}`, `value-${j}`)
    bees.push(bee)
    console.log('created bee', i, getHeapMb())
  }

  console.log('fetching entries', getHeapMb())
  for (let i = 0; i < nrBees; i++) {
    for (let j = 0; j < nrBlocks; j++) await bees[i].get(`entry-${j}`)
    console.log('cache misses bee', i, ':', bees[i].cacheMisses, getHeapMb())
  }

  for (let i = 0; i < nrCores; i++) {
    for (let j = 0; j < nrBlocks; j++) await cores[i].get(j)
    console.log('cache misses core', i, ':', cores[i].cacheMisses, getHeapMb())
  }
}

function getHeapMb () {
  return `Heap used: ${Math.round(process.memoryUsage().heapUsed / 1000_10) / 100}Mb`
}

class Hypercore {
  constructor (globalCache) {
    this.discoveryKey = hypCrypt.randomBytes(32)
    this.nextI = 0
    this.globalCache = globalCache.sub(`${idEnc.normalize(this.discoveryKey)}-core-`)
    this.cacheMisses = 0

    this.fork = 0
  }

  async get (i) {
    return this.globalCache.get(i, this.fork) || await this._get(i)
  }

  async _get (i) {
    this.cacheMisses++
    // Simulate fetching from disk
    await new Promise(resolve => setTimeout(resolve, 1))
    const res = `value-${i}`

    this.globalCache.set(i, this.fork, res)
    return res
  }

  append () {
    const i = this.nextI++
    this.globalCache.set(i, this.fork, `value-${i}`)
  }
}

class Hyperbee {
  // Note: very quick and dirty, not how hyperbee actually uses its caches
  constructor (core, globalCache) {
    this.discoveryKey = core.discoveryKey
    this.nextI = 0
    this.nodeCache = globalCache.sub(`${idEnc.normalize(this.discoveryKey)}-bee-node-`)
    this.keyCache = globalCache.sub(`${idEnc.normalize(this.discoveryKey)}-bee-key-`)

    this.cacheMisses = 0

    this.core = core
  }

  async get (i) {
    // Note: this is not at all how the hyperbee cache works
    // (it would cache the nodes/keys corresponding to a certain index,
    // but not the entries themselves).
    // This serves only to illustrate how the same core can have multiple global-cache namespaces
    return this.nodeCache.get(i, this.core.fork) || await this._get(i)
  }

  async _get (i) {
    this.cacheMisses++

    // Simulate loading from disk
    await new Promise(resolve => setTimeout(resolve, 1))

    const res = { key: i, value: `value-${i}`, seq: i }

    // Note: not at all how hyperbee caching works (see comment above for get (i))
    // Note: we might set the same value multiple times if _get called in parallel with same i (but that's no big deal)
    this.nodeCache.set(i, this.core.fork, res)
    return res
  }

  put (i) {
    this.nodeCache.set(i, this.core.fork, { key: i, value: `value-${i}`, seq: this.nextI++ })
  }
}

main()
