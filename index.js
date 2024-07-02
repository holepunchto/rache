class Entry {
  constructor (key, index, value) {
    this.key = key
    this.index = index
    this.value = value
  }
}

class GlobalCache {
  constructor ({ maxSize = 65536, subName = '', parent = null } = {}) {
    this.maxSize = parent?.maxSize || maxSize
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

  set (key, value) { // ~constant time
    key = `${this.subName}${key}`

    const current = this._map.get(key)
    if (current) {
      // Auto updates the array entry too
      current.value = value
    } else {
      if (this.size >= this.maxSize) this._gc()

      const entry = new Entry(key, this._array.length, value)
      this._array.push(entry)
      this._map.set(key, entry)
    }
  }

  get (key) {
    key = `${this.subName}${key}`
    return this._map.get(key)?.value
  }

  _gc () {
    this._delete(Math.floor(Math.random() * this.size))
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
