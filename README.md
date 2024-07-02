# Hypercore Cache

A global cache used in the Hypercore ecosystem.

It randomly evicts a proportion of its entries when it's full.

`get` and `set` operations take constant time.

The garbage collection takes linear time in function of the amount of items to clear.

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
- fork
- block nr

Each object is responsible for registering itself with the passed-in global cache, providing its discovery key and the cache name. For example, a hyperbee registers 2 caches:

```
this.nodeCache = globalCache.sub(`${idEnc.normalize(this.discoveryKey)}-bee-node-`)
this.keyCache = globalCache.sub(`${idEnc.normalize(this.discoveryKey)}-bee-key-`)

```

The fork and blockNr are passed in to the cache API calls:

```
cache.set(key, fork, value) // Set the key at the given fork to that value
cache.get(key, fork) // Returns the value if it was cached for that fork
```

This is simpler than special-casing fork changes outside the cache.

The cache currently assumes that we only ever care about one fork simultaneously, which simplifies the logic (can be adapted if not true).
