
// Assumptions:
// - Combination of discovery-key, index, and type (either 'core' or bee for now) is unique
//    Note: 'core' and 'bee' are needed, because the same core can be accessed as both hypercore and hyperbee
//      and there is no guarantee for the keys not to overlap in that case
//    TODO: 99% sure the fork nr needs to be added to the unique name
// - A value is always accessed using the same encoding
//    await bee.set(key, { keyEncoding: 'utf-8 })
//    await bee.get(key, { keyEncoding: 'binary' }) // This breaks, it will still return the cached utf-8

class Entry {
  constructor (key, value, index) {
    this.key = key
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

  _gc (prop) {
    if (!prop) prop = this.defaultGcProp

    const start = Math.round(this.size * (1 - prop))
    const nrToDel = this.size - start
    console.log('gcing', nrToDel, 'entries')

    // TODO: more efficiently? (I think this naive approach is pretty fast though)
    for (let i = 0; i < nrToDel; i++) {
      this._delete(Math.floor(Math.random() * this.size))
    }
  }

  set (key, value) { // ~constant time
    key = `${this.subName}${key}`

    const current = this._map.get(key)
    if (current) {
      // Auto updates the array entry too
      current.value = value
    } else {
      if (this.size >= this.maxSize) this._gc()

      const entry = new Entry(key, value, this._array.length)
      this._array.push(entry)
      this._map.set(key, entry)
    }
  }

  get (key) {
    key = `${this.subName}${key}`
    return this._map.get(key)?.value
  }

  _delete (index) { // ~constant time
    if (index >= this._array.length) throw new Error('Cannot delete unused index (logic bug?)')

    const isLast = this._array.length === index + 1
    const lastEntry = this._array.pop()

    let key = lastEntry.key
    if (!isLast) {
      key = this._array[index].key
      lastEntry.index = index
      this._array[index] = lastEntry
    }

    this._map.delete(key)
  }
}

module.exports = GlobalCache
