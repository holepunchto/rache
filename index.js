class Entry {
  constructor (key, fork, index, value) {
    this.key = key
    this.fork = fork
    this.index = index
    this.value = value
  }
}

class GlobalCache {
  constructor ({ maxSize = 65536, subName = '', parent = null } = {}) {
    this.maxSize = parent?.maxSize || maxSize
    this.defaultGcProp = parent?.defaultGcProp || 0.1
    this.subName = subName

    this._array = parent?._array || []
    this._map = parent?._map || new Map()
  }

  get size () {
    return this._array.length
  }

  sub (subName) {
    return new GlobalCache({ subName, parent: this })
  }

  set (key, fork, value) { // ~constant time
    key = `${this.subName}${key}`

    const current = this._map.get(key)
    if (current) {
      // Auto updates the array entry too
      current.value = value
      current.fork = fork // Assumes we only ever care about one fork simulatenously
    } else {
      if (this.size >= this.maxSize) this._gc()

      const entry = new Entry(key, fork, this._array.length, value)
      this._array.push(entry)
      this._map.set(key, entry)
    }
  }

  get (key, fork) {
    key = `${this.subName}${key}`
    const res = this._map.get(key)

    // We could explicitly gc the old fork, but upstream
    // should take care of that (calling cache.set on a cache miss)
    // (and if not, the cache will gc it at some point anyway)
    return res?.fork === fork ? res.value : undefined
  }

  _gc (prop) {
    if (!prop) prop = this.defaultGcProp

    const start = Math.round(this.size * (1 - prop))
    const nrToDel = this.size - start
    console.log('gcing', nrToDel, 'entries')

    // TODO: more efficiently? (I think this naive approach is 'fast though' though)
    for (let i = 0; i < nrToDel; i++) {
      this._delete(Math.floor(Math.random() * this.size))
    }
  }

  _delete (index) { // ~constant time
    if (index >= this._array.length) throw new Error('Cannot delete unused index (logic bug?)')

    const isLast = this._array.length === index + 1
    const lastEntry = this._array.pop()

    let key = lastEntry.key
    if (!isLast) {
      key = this._array[index].key
      lastEntry.index = index // entry is shared between map and array, so updates in both
      this._array[index] = lastEntry
    }

    this._map.delete(key)
  }
}

module.exports = GlobalCache
