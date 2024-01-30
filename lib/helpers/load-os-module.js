'use strict';

/**
 * @typedef {function(): T} DeferModule
 * @template T
 */

/**
 * @param {string} name
 * @param {{[key: string]: DeferModule<T>}} deferredModules
 * @return {T}
 * @template T
 */
function loadOsModule(name, deferredModules) {
  const { platform } = process;
  if (!(platform in deferredModules)) {
    throw new Error(`No "${name}" module for platform "${platform}"`);
  }

  return deferredModules[platform]();
}

module.exports = {
  loadOsModule,
};
