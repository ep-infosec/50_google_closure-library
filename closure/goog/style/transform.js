/**
 * @license
 * Copyright The Closure Library Authors.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Utility methods to deal with CSS3 transforms programmatically.
 */

goog.provide('goog.style.transform');

goog.require('goog.functions');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Coordinate3');
goog.require('goog.style');
goog.require('goog.userAgent');



/**
 * Returns the x,y translation component of any CSS transforms applied to the
 * element, in pixels.
 *
 * @param {!Element} element The element to get the translation of.
 * @return {!goog.math.Coordinate} The CSS translation of the element in px.
 */
goog.style.transform.getTranslation = function(element) {
  'use strict';
  var transform = goog.style.getComputedTransform(element);
  var matrixConstructor = goog.style.transform.matrixConstructor_();
  if (transform && matrixConstructor) {
    var matrix = new matrixConstructor(transform);
    if (matrix) {
      return new goog.math.Coordinate(matrix.m41, matrix.m42);
    }
  }
  return new goog.math.Coordinate(0, 0);
};


/**
 * Translates an element's position using the CSS3 transform property.
 * NOTE: This replaces all other transforms already defined on the element.
 * @param {Element} element The element to translate.
 * @param {number} x The horizontal translation.
 * @param {number} y The vertical translation.
 * @return {boolean} Whether the CSS translation was set.
 */
goog.style.transform.setTranslation = function(element, x, y) {
  'use strict';
  // TODO(user): After http://crbug.com/324107 is fixed, it will be faster to
  // use something like: translation = new CSSMatrix().translate(x, y, 0);
  var translation = 'translate3d(' + x + 'px,' + y + 'px,' +
      '0px)';
  goog.style.setStyle(
      element, goog.style.transform.getTransformProperty_(), translation);
  return true;
};


/**
 * Returns the scale of the x, y and z dimensions of CSS transforms applied to
 * the element.
 *
 * @param {!Element} element The element to get the scale of.
 * @return {!goog.math.Coordinate3} The scale of the element.
 */
goog.style.transform.getScale = function(element) {
  'use strict';
  var transform = goog.style.getComputedTransform(element);
  var matrixConstructor = goog.style.transform.matrixConstructor_();
  if (transform && matrixConstructor) {
    var matrix = new matrixConstructor(transform);
    if (matrix) {
      return new goog.math.Coordinate3(matrix.m11, matrix.m22, matrix.m33);
    }
  }
  return new goog.math.Coordinate3(0, 0, 0);
};


/**
 * Scales an element using the CSS3 transform property.
 * NOTE: This replaces all other transforms already defined on the element.
 * @param {!Element} element The element to scale.
 * @param {number} x The horizontal scale.
 * @param {number} y The vertical scale.
 * @param {number} z The depth scale.
 * @return {boolean} Whether the CSS scale was set.
 */
goog.style.transform.setScale = function(element, x, y, z) {
  'use strict';
  var scale = 'scale3d(' + x + ',' + y + ',' + z + ')';
  goog.style.setStyle(
      element, goog.style.transform.getTransformProperty_(), scale);
  return true;
};


/**
 * Returns the rotation CSS transform applied to the element.
 * @param {!Element} element The element to get the rotation of.
 * @return {number} The rotation of the element in degrees.
 */
goog.style.transform.getRotation = function(element) {
  'use strict';
  var transform = goog.style.getComputedTransform(element);
  var matrixConstructor = goog.style.transform.matrixConstructor_();
  if (transform && matrixConstructor) {
    var matrix = new matrixConstructor(transform);
    if (matrix) {
      var x = matrix.m11 + matrix.m22;
      var y = matrix.m12 - matrix.m21;
      return Math.atan2(y, x) * (180 / Math.PI);
    }
  }
  return 0;
};


/**
 * Rotates an element using the CSS3 transform property.
 * NOTE: This replaces all other transforms already defined on the element.
 * @param {!Element} element The element to rotate.
 * @param {number} degrees The number of degrees to rotate by.
 * @return {boolean} Whether the CSS rotation was set.
 */
goog.style.transform.setRotation = function(element, degrees) {
  'use strict';
  var rotation = 'rotate3d(0,0,1,' + degrees + 'deg)';
  goog.style.setStyle(
      element, goog.style.transform.getTransformProperty_(), rotation);
  return true;
};


/**
 * A cached value of the transform property depending on whether the useragent
 * is IE9.
 * @return {string} The transform property depending on whether the useragent
 *     is IE9.
 * @private
 */
goog.style.transform.getTransformProperty_ =
    goog.functions.cacheReturnValue(function() {
      'use strict';
      return goog.userAgent.IE && goog.userAgent.DOCUMENT_MODE == 9 ?
          '-ms-transform' :
          'transform';
    });


/**
 * Gets the constructor for a CSSMatrix object.
 * @return {function(new:CSSMatrix, string)?} A constructor for a CSSMatrix
 *     object (or null).
 * @private
 */
goog.style.transform.matrixConstructor_ =
    goog.functions.cacheReturnValue(function() {
      'use strict';
      if (goog.global['WebKitCSSMatrix'] !== undefined) {
        return goog.global['WebKitCSSMatrix'];
      }
      if (goog.global['MSCSSMatrix'] !== undefined) {
        return goog.global['MSCSSMatrix'];
      }
      if (goog.global['CSSMatrix'] !== undefined) {
        return goog.global['CSSMatrix'];
      }
      return null;
    });
