/**
 * @license
 * Copyright The Closure Library Authors.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Factory class to create a simple autocomplete that will match
 * from an array of data provided via ajax.
 *
 * @see ../../demos/autocompleteremote.html
 */

goog.provide('goog.ui.ac.Remote');

goog.require('goog.ui.ac.AutoComplete');
goog.require('goog.ui.ac.InputHandler');
goog.require('goog.ui.ac.RemoteArrayMatcher');
goog.require('goog.ui.ac.Renderer');
goog.requireType('goog.structs.Map');



/**
 * Factory class for building a remote autocomplete widget that autocompletes
 * an inputbox or text area from a data array provided via ajax.
 * @param {string} url The Uri which generates the auto complete matches.
 * @param {Element} input Input element or text area.
 * @param {boolean=} opt_multi Whether to allow multiple entries; defaults
 *     to false.
 * @param {boolean=} opt_useSimilar Whether to use similar matches; e.g.
 *     "gost" => "ghost".
 * @constructor
 * @extends {goog.ui.ac.AutoComplete}
 */
goog.ui.ac.Remote = function(url, input, opt_multi, opt_useSimilar) {
  'use strict';
  var matcher = new goog.ui.ac.RemoteArrayMatcher(url, !opt_useSimilar);
  this.matcher_ = matcher;

  var renderer = new goog.ui.ac.Renderer();

  var inputhandler = new goog.ui.ac.InputHandler(null, null, !!opt_multi, 300);

  goog.ui.ac.AutoComplete.call(this, matcher, renderer, inputhandler);

  inputhandler.attachAutoComplete(this);
  inputhandler.attachInputs(input);
};
goog.inherits(goog.ui.ac.Remote, goog.ui.ac.AutoComplete);


/**
 * Set whether or not standard highlighting should be used when rendering rows.
 * @param {boolean} useStandardHighlighting true if standard highlighting used.
 * @suppress {strictMissingProperties} Added to tighten compiler checks
 */
goog.ui.ac.Remote.prototype.setUseStandardHighlighting = function(
    useStandardHighlighting) {
  'use strict';
  this.renderer_.setUseStandardHighlighting(useStandardHighlighting);
};


/**
 * Gets the attached InputHandler object.
 * @return {goog.ui.ac.InputHandler} The input handler.
 */
goog.ui.ac.Remote.prototype.getInputHandler = function() {
  'use strict';
  return /** @type {goog.ui.ac.InputHandler} */ (this.selectionHandler_);
};


/**
 * Set the send method ("GET", "POST") for the matcher.
 * @param {string} method The send method; default: GET.
 * @suppress {strictMissingProperties} Added to tighten compiler checks
 */
goog.ui.ac.Remote.prototype.setMethod = function(method) {
  'use strict';
  this.matcher_.setMethod(method);
};


/**
 * Set the post data for the matcher.
 * @param {string} content Post data.
 * @suppress {strictMissingProperties} Added to tighten compiler checks
 */
goog.ui.ac.Remote.prototype.setContent = function(content) {
  'use strict';
  this.matcher_.setContent(content);
};


/**
 * Set the HTTP headers for the matcher.
 * @param {Object|goog.structs.Map} headers Map of headers to add to the
 *     request.
 * @suppress {strictMissingProperties} Added to tighten compiler checks
 */
goog.ui.ac.Remote.prototype.setHeaders = function(headers) {
  'use strict';
  this.matcher_.setHeaders(headers);
};


/**
 * Set the timeout interval for the matcher.
 * @param {number} interval Number of milliseconds after which an
 *     incomplete request will be aborted; 0 means no timeout is set.
 * @suppress {strictMissingProperties} Added to tighten compiler checks
 */
goog.ui.ac.Remote.prototype.setTimeoutInterval = function(interval) {
  'use strict';
  this.matcher_.setTimeoutInterval(interval);
};
