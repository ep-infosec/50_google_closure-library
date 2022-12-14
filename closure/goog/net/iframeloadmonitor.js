/**
 * @license
 * Copyright The Closure Library Authors.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Class that can be used to determine when an iframe is loaded.
 */

goog.provide('goog.net.IframeLoadMonitor');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');



/**
 * The correct way to determine whether a same-domain iframe has completed
 * loading is different in IE and Firefox.  This class abstracts above these
 * differences, providing a consistent interface for:
 * <ol>
 * <li> Determing if an iframe is currently loaded
 * <li> Listening for an iframe that is not currently loaded, to finish loading
 * </ol>
 *
 * @param {HTMLIFrameElement} iframe An iframe.
 * @param {boolean=} opt_hasContent Whether to wait for the loaded iframe to
 *     have content in its document body.
 * @extends {goog.events.EventTarget}
 * @constructor
 * @final
 */
goog.net.IframeLoadMonitor = function(iframe, opt_hasContent) {
  'use strict';
  goog.net.IframeLoadMonitor.base(this, 'constructor');

  /**
   * Iframe whose load state is monitored by this IframeLoadMonitor
   * @type {HTMLIFrameElement}
   * @private
   */
  this.iframe_ = iframe;

  /**
   * Whether to wait for the loaded iframe to have content in its document body.
   * @type {boolean}
   * @private
   */
  this.hasContent_ = !!opt_hasContent;

  /**
   * Whether or not the iframe is loaded.
   * @type {boolean}
   * @private
   */
  this.isLoaded_ = this.isLoadedHelper_();

  if (!this.isLoaded_) {
    const loadEvtType = goog.events.EventType.LOAD;
    this.onloadListenerKey_ = goog.events.listen(
        this.iframe_, loadEvtType, this.handleLoad_, false, this);

    // Sometimes we still don't get the event callback, so we'll poll just to
    // be safe.
    this.intervalId_ = window.setInterval(
        goog.bind(this.handleLoad_, this),
        goog.net.IframeLoadMonitor.POLL_INTERVAL_MS_);
  }
};
goog.inherits(goog.net.IframeLoadMonitor, goog.events.EventTarget);


/**
 * Event type dispatched by a goog.net.IframeLoadMonitor when it internal iframe
 * finishes loading for the first time after construction of the
 * goog.net.IframeLoadMonitor
 * @type {string}
 */
goog.net.IframeLoadMonitor.LOAD_EVENT = 'ifload';


/**
 * Poll interval for polling iframe load states in milliseconds.
 * @type {number}
 * @private
 */
goog.net.IframeLoadMonitor.POLL_INTERVAL_MS_ = 100;


/**
 * Key for iframe load listener, or null if not currently listening on the
 * iframe for a load event.
 * @type {?goog.events.Key}
 * @private
 */
goog.net.IframeLoadMonitor.prototype.onloadListenerKey_ = null;


/**
 * Returns whether or not the iframe is loaded.
 * @return {boolean} whether or not the iframe is loaded.
 */
goog.net.IframeLoadMonitor.prototype.isLoaded = function() {
  'use strict';
  return this.isLoaded_;
};


/**
 * Stops the poll timer if this IframeLoadMonitor is currently polling.
 * @private
 */
goog.net.IframeLoadMonitor.prototype.maybeStopTimer_ = function() {
  'use strict';
  if (this.intervalId_) {
    window.clearInterval(this.intervalId_);
    this.intervalId_ = null;
  }
};


/**
 * Returns the iframe whose load state this IframeLoader monitors.
 * @return {HTMLIFrameElement} the iframe whose load state this IframeLoader
 *     monitors.
 */
goog.net.IframeLoadMonitor.prototype.getIframe = function() {
  'use strict';
  return this.iframe_;
};


/** @override */
goog.net.IframeLoadMonitor.prototype.disposeInternal = function() {
  'use strict';
  delete this.iframe_;
  this.maybeStopTimer_();
  goog.events.unlistenByKey(this.onloadListenerKey_);
  goog.net.IframeLoadMonitor.superClass_.disposeInternal.call(this);
};


/**
 * Returns whether or not the iframe is loaded.  Determines this by inspecting
 * browser dependent properties of the iframe.
 * @return {boolean} whether or not the iframe is loaded.
 * @private
 */
goog.net.IframeLoadMonitor.prototype.isLoadedHelper_ = function() {
  'use strict';
  let isLoaded = false;

  try {
    // For other browsers, check whether the document body exists to determine
    // whether the iframe has loaded. Older versions of Firefox may fire the
    // LOAD event early for an empty frame and then, a few hundred
    // milliseconds later, replace the contentDocument. If the hasContent
    // check is requested, the iframe is considered loaded only once there is
    // content in the body.
    const body = goog.dom.getFrameContentDocument(this.iframe_).body;
    isLoaded = this.hasContent_ ? !!body && !!body.firstChild : !!body;
  } catch (e) {
    // Ignore these errors. This just means that the iframe is not loaded
    // IE will throw error reading readyState if the iframe is not appended
    // to the dom yet.
    // Firefox will throw error getting the iframe body if the iframe is not
    // fully loaded.
  }
  return isLoaded;
};


/**
 * Handles an event indicating that the loading status of the iframe has
 * changed.  In Firefox this is a goog.events.EventType.LOAD event, in IE
 * this is a goog.events.EventType.READYSTATECHANGED
 * @private
 */
goog.net.IframeLoadMonitor.prototype.handleLoad_ = function() {
  'use strict';
  // Only do the handler if the iframe is loaded.
  if (this.isLoadedHelper_()) {
    this.maybeStopTimer_();
    goog.events.unlistenByKey(this.onloadListenerKey_);
    this.onloadListenerKey_ = null;
    this.isLoaded_ = true;
    this.dispatchEvent(goog.net.IframeLoadMonitor.LOAD_EVENT);
  }
};
