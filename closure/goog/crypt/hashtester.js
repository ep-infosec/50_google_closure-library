/**
 * @license
 * Copyright The Closure Library Authors.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Unit tests for the abstract cryptographic hash interface.
 */

goog.provide('goog.crypt.hashTester');

goog.require('goog.crypt');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.reflect');
goog.require('goog.testing.PerformanceTable');
goog.require('goog.testing.PseudoRandom');
goog.require('goog.testing.asserts');
goog.setTestOnly('hashTester');
goog.requireType('goog.crypt.Hash');


/**
 * Runs basic tests.
 *
 * @param {!goog.crypt.Hash} hash A hash instance.
 */
goog.crypt.hashTester.runBasicTests = function(hash) {
  'use strict';
  // Compute first hash.
  hash.update([97, 158]);
  var golden1 = hash.digest();

  // Compute second hash.
  hash.reset();
  hash.update('aB');
  var golden2 = hash.digest();
  assertTrue(
      'Two different inputs resulted in a hash collision',
      !!goog.testing.asserts.findDifferences(golden1, golden2));

  // Empty hash.
  hash.reset();
  var empty = hash.digest();
  assertTrue(
      'Empty hash collided with a non-trivial one',
      !!goog.testing.asserts.findDifferences(golden1, empty) &&
          !!goog.testing.asserts.findDifferences(golden2, empty));

  // Zero-length array update.
  hash.reset();
  hash.update([]);
  assertArrayEquals(
      'Updating with an empty array did not give an empty hash', empty,
      hash.digest());

  // Zero-length string update.
  hash.reset();
  hash.update('');
  assertArrayEquals(
      'Updating with an empty string did not give an empty hash', empty,
      hash.digest());

  // Recompute the first hash.
  hash.reset();
  hash.update([97, 158]);
  assertArrayEquals(
      'The reset did not produce the initial state', golden1, hash.digest());

  // Check for a trivial collision.
  hash.reset();
  hash.update([158, 97]);
  assertTrue(
      'Swapping bytes resulted in a hash collision',
      !!goog.testing.asserts.findDifferences(golden1, hash.digest()));

  // Compare array and string input.
  hash.reset();
  hash.update([97, 66]);
  assertArrayEquals(
      'String and array inputs should give the same result', golden2,
      hash.digest());

  // Compute in parts.
  hash.reset();
  hash.update('a');
  hash.update([158]);
  assertArrayEquals(
      'Partial updates resulted in a different hash', golden1, hash.digest());

  // Test update with specified length.
  hash.reset();
  hash.update('aB', 0);
  hash.update([97, 158, 32], 2);
  assertArrayEquals(
      'Updating with an explicit buffer length did not work', golden1,
      hash.digest());
};


/**
 * Runs block tests.
 *
 * @param {!goog.crypt.Hash} hash A hash instance.
 * @param {number} blockBytes Size of the hash block.
 */
goog.crypt.hashTester.runBlockTests = function(hash, blockBytes) {
  'use strict';
  // Compute a message which is 1 byte shorter than hash block size.
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var message = '';
  for (var i = 0; i < blockBytes - 1; i++) {
    message += chars.charAt(i % chars.length);
  }

  // Compute golden hash for 1 block + 2 bytes.
  hash.update(message + '123');
  var golden1 = hash.digest();

  // Compute golden hash for 2 blocks + 1 byte.
  hash.reset();
  hash.update(message + message + '123');
  var golden2 = hash.digest();

  // Almost fill a block, then overflow.
  hash.reset();
  hash.update(message);
  hash.update('123');
  assertArrayEquals(golden1, hash.digest());

  // Fill a block.
  hash.reset();
  hash.update(message + '1');
  hash.update('23');
  assertArrayEquals(golden1, hash.digest());

  // Overflow a block.
  hash.reset();
  hash.update(message + '12');
  hash.update('3');
  assertArrayEquals(golden1, hash.digest());

  // Test single overflow with an array.
  hash.reset();
  hash.update(goog.crypt.stringToByteArray(message + '123'));
  assertArrayEquals(golden1, hash.digest());

  // Almost fill a block, then overflow this and the next block.
  hash.reset();
  hash.update(message);
  hash.update(message + '123');
  assertArrayEquals(golden2, hash.digest());

  // Fill two blocks.
  hash.reset();
  hash.update(message + message + '12');
  hash.update('3');
  assertArrayEquals(golden2, hash.digest());

  // Test double overflow with an array.
  hash.reset();
  hash.update(goog.crypt.stringToByteArray(message));
  hash.update(goog.crypt.stringToByteArray(message + '123'));
  assertArrayEquals(golden2, hash.digest());
};


/**
 * Runs performance tests.
 *
 * @param {function():!goog.crypt.Hash} hashFactory A hash factory.
 * @param {string} hashName Name of the hashing function.
 */
goog.crypt.hashTester.runPerfTests = function(hashFactory, hashName) {
  'use strict';
  var body = goog.dom.getDocument().body;
  var perfTable = goog.dom.createElement(goog.dom.TagName.DIV);
  goog.dom.appendChild(body, perfTable);

  var table = new goog.testing.PerformanceTable(perfTable);

  function runPerfTest(byteLength, updateCount) {
    var label =
        (hashName + ': ' + updateCount + ' update(s) of ' + byteLength +
         ' bytes');

    function run(data, dataType) {
      table.run(function() {
        'use strict';
        var hash = hashFactory();
        for (var i = 0; i < updateCount; i++) {
          hash.update(data, byteLength);
        }
        // Prevent JsCompiler optimizations from invalidating the benchmark.
        goog.reflect.sinkValue(hash.digest());
      }, label + ' (' + dataType + ')');
    }

    var byteArray = goog.crypt.hashTester.createRandomByteArray_(byteLength);
    var byteString = goog.crypt.hashTester.createByteString_(byteArray);

    run(byteArray, 'byte array');
    run(byteString, 'byte string');
  }

  var MESSAGE_LENGTH_LONG = 10000000;  // 10 Mbytes
  var MESSAGE_LENGTH_SHORT = 10;       // 10 bytes
  var MESSAGE_COUNT_SHORT = MESSAGE_LENGTH_LONG / MESSAGE_LENGTH_SHORT;

  runPerfTest(MESSAGE_LENGTH_LONG, 1);
  runPerfTest(MESSAGE_LENGTH_SHORT, MESSAGE_COUNT_SHORT);
};


/**
 * Creates and returns a random byte array.
 *
 * @param {number} length Length of the byte array.
 * @return {!Array<number>} An array of bytes.
 * @private
 */
goog.crypt.hashTester.createRandomByteArray_ = function(length) {
  'use strict';
  var random = new goog.testing.PseudoRandom(0);
  var bytes = [];

  for (var i = 0; i < length; ++i) {
    // Generates an integer from 0 to 255.
    var b = Math.floor(random.random() * 0x100);
    bytes.push(b);
  }

  return bytes;
};


/**
 * Creates a string from an array of bytes.
 *
 * @param {!Array<number>} bytes An array of bytes.
 * @return {string} The string encoded by the bytes.
 * @private
 */
goog.crypt.hashTester.createByteString_ = function(bytes) {
  'use strict';
  var str = '';
  bytes.forEach(function(b) {
    'use strict';
    str += String.fromCharCode(b);
  });
  return str;
};
