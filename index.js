class Entry {
  constructor (key, index, map) {
    this.key = key
    this.index = index
    this.map = map
  }
}

class GlobalCache {
  constructor ({ maxSize = 65536, prefix = '!', parent = null } = {}) {
    this.maxSize = parent?.maxSize || maxSize
    this.prefix = prefix

    this._array = parent?._array || []
    this._map = new Map()
    this._subs = 0
  }

  get globalSize () {
    return this._array.length
  }

  get size () {
    return this._map.size
  }

  sub () {
    const prefix = this.prefix + (this._subs++) + '!'
    return new GlobalCache({ prefix, parent: this })
  }

  set (key, value) { // ~constant time
    key = this.prefix + key

    const existing = this._map.get(key)
    if (existing !== undefined) {
      existing.value = value
      return
    }

    if (this._array.length >= this.maxSize) this._gc()

    const entry = new Entry(key, this._array.length, this._map)
    this._array.push(entry)
    this._map.set(key, { entry, value })
  }

  delete (key) {
    key = this.prefix + key
    const existing = this._map.get(key)
    if (existing === undefined) return false
    this._delete(existing.index)
    return true
  }

  get (key) {
    key = this.prefix + key
    const existing = this._map.get(key)
    return existing === undefined ? undefined : existing.value
  }

  * [Symbol.iterator] () {
    for (const [key, { value }] of this._map) {
      yield [key.slice(this.prefix.length), value]
    }
  }

  * keys () {
    for (const key of this._map.keys()) {
      yield key.slice(this.prefix.length)
    }
  }

  * values () {
    for (const { value } of this._map.values()) {
      yield value
    }
  }

  clear () {
    this._map.clear()
    // instead of clearing the map, we kill the ref, so that any gc running on the old map wont interfere
    this._map = new Map()
  }

  destroy () {
    this._map = null
  }

  _gc () {
    this._delete(Math.floor(Math.random() * this._array.length))
  }

  _delete (index) { // ~constant time
    if (index >= this._array.length) throw new Error('Cannot delete unused index (logic bug?)')

    const head = this._array.pop()
    let removed = head

    if (index < this._array.length) {
      removed = this._array[index]
      head.index = index
      this._array[index] = head
    }

    removed.map.delete(removed.key)
  }
}

module.exports = GlobalCache
