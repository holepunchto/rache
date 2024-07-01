const hypCrypt = require('hypercore-crypto')
const idEnc = require('hypercore-id-encoding')
const GlobalCache = require('.')

async function main () {
  const maxSize = 65536
  const globalCache = new GlobalCache({ maxSize })
  const nrCores = 6
  const nrBees = 8
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
  let totalCacheMisses = 0
  // Most recent, so all in cache
  for (let i = 0; i < nrBees; i++) {
    for (let j = 0; j < nrBlocks; j++) await bees[i].get(`entry-${j}`)
    console.log('cache misses bee', i, bees[i].cacheMisses, getHeapMb())
    totalCacheMisses += bees[i].cacheMisses
  }

  for (let i = 0; i < nrCores; i++) {
    for (let j = 0; j < nrBlocks; j++) await cores[i].get(j)
    console.log('cache misses core', i, cores[i].cacheMisses, getHeapMb())
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
  }

  async get (i) {
    return this.globalCache.get(i) || await this._get(i)
  }

  async _get (i) {
    this.cacheMisses++
    // Simulate fetching from disk
    await new Promise(resolve => setTimeout(resolve, 1))
    const res = `value-${i}`

    this.globalCache.set(i, res)
    return res
  }

  append () {
    const i = this.nextI++
    this.globalCache.set(i, `value-${i}`)
  }
}

class Hyperbee {
  constructor (core, globalCache) {
    this.discoveryKey = core.discoveryKey
    this.nextI = 0
    this.globalCache = globalCache.sub(`${idEnc.normalize(this.discoveryKey)}-bee-`)
    this.cacheMisses = 0
  }

  async get (i) {
    return this.globalCache.get(i) || await this._get(i)
  }

  async _get (i) {
    this.cacheMisses++

    // Simulate loading from disk
    await new Promise(resolve => setTimeout(resolve, 1))

    const res = { key: i, value: `value-${i}`, seq: i }

    this.globalCache.set(i, res)
    return res
  }

  put (i) {
    this.globalCache.set(i, { key: i, value: `value-${i}`, seq: this.nextI++ })
  }
}

main()
