# Hypercore Cache

A global cache used in the Hypercore ecosystem.

It randomly evicts an entry when it is full.

eviction and `get` and `set` operations take constant time.

## Run example

```
npm i

// For the basic API
node example.js

// For a dummy implementation of hypercore and hyperbee, also illustration memory usage
node core-bee-example.js
```

## Design

The main assumption is that the combination of these fields yields a unique cache-block identifier:

- discovery key
- cache name (initially 'core', 'bee-keys' and 'bee-nodes' )
- block nr

Each object is responsible for registering itself with the passed-in global cache, providing its discovery key and the cache name. For example, a hyperbee registers 2 caches:

```
this.nodeCache = globalCache.sub(`${idEnc.normalize(this.discoveryKey)}-bee-node-`)
this.keyCache = globalCache.sub(`${idEnc.normalize(this.discoveryKey)}-bee-key-`)

```

The blockNr is passed in to the cache API calls:

```
cache.set(key, value)
cache.get(key) // Returns the value if it was cached
```

This is simpler than special-casing fork changes outside the cache.

The cache currently assumes that we only ever care about one fork simultaneously, which simplifies the logic (can be adapted if not true).
