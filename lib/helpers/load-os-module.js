'use strict';

/**
 * @typedef {function(): T} DeferModule
 * @template T
 */

/**
 * @param {{[key: string]: DeferModule<T>}} deferredModules
 * @return {T}
 * @template T
 */
function loadOsModule(deferredModules) {
  const { platform } = process;
  if (!(platform in deferredModules)) {
    throw new Error(`No module for platform "${platform}"`);
  }

  return deferredModules[platform]();
}

module.exports = {
  loadOsModule,
};
