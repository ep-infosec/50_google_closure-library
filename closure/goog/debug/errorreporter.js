/**
 * @license
 * Copyright The Closure Library Authors.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Definition of the ErrorReporter class, which creates an error
 * handler that reports any errors raised to a URL.
 */

goog.provide('goog.debug.ErrorReporter');
goog.provide('goog.debug.ErrorReporter.ExceptionEvent');

goog.require('goog.asserts');
goog.require('goog.debug');
goog.require('goog.debug.Error');
goog.require('goog.debug.ErrorHandler');
goog.require('goog.debug.entryPointRegistry');
goog.require('goog.debug.errorcontext');
goog.require('goog.dispose');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');
goog.require('goog.log');
goog.require('goog.net.XhrIo');
goog.require('goog.object');
goog.require('goog.uri.utils');



/**
 * Constructs an error reporter. Internal Use Only. To install an error
 * reporter see the {@see #install} method below.
 *
 * @param {string} handlerUrl The URL to which all errors will be reported.
 * @param {function(!Error, !Object<string, string>)=}
 *     opt_contextProvider When a report is to be sent to the server,
 *     this method will be called, and given an opportunity to modify the
 *     context object before submission to the server.
 * @param {boolean=} opt_noAutoProtect Whether to automatically add handlers for
 *     onerror and to protect entry points.  If apps have other error reporting
 *     facilities, it may make sense for them to set these up themselves and use
 *     the ErrorReporter just for transmission of reports.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
goog.debug.ErrorReporter = function(
    handlerUrl, opt_contextProvider, opt_noAutoProtect) {
  'use strict';
  goog.debug.ErrorReporter.base(this, 'constructor');

  /**
   * Context provider, if one was provided.
   * @type {?function(!Error, !Object<string, string>)}
   * @private
   */
  this.contextProvider_ = opt_contextProvider || null;

  /**
   * The string prefix of any optional context parameters logged with the error.
   * @private {string}
   */
  this.contextPrefix_ = 'context.';

  /**
   * The number of bytes after which the ErrorReporter truncates the POST body.
   * If null, the ErrorReporter won't truncate the body.
   * @private {?number}
   */
  this.truncationLimit_ = null;

  /**
   * Additional arguments to append to URL before sending XHR.
   * @private {!Object<string,string>}
   */
  this.additionalArguments_ = {};

  /**
   * XHR sender.
   * @type {function(string, string, string, (Object|!Map<string, string>)=)}
   * @private
   */
  this.xhrSender_ = goog.debug.ErrorReporter.defaultXhrSender;

  /**
   * The URL at which all errors caught by this handler will be logged.
   *
   * @type {string}
   * @private
   */
  this.handlerUrl_ = handlerUrl;

  if (goog.debug.ErrorReporter.ALLOW_AUTO_PROTECT) {
    if (!opt_noAutoProtect) {
      /**
       * The internal error handler used to catch all errors.
       *
       * @private {?goog.debug.ErrorHandler}
       */
      this.errorHandler_ = null;

      this.setup_();
    }
  } else if (!opt_noAutoProtect) {
    goog.asserts.fail(
        'opt_noAutoProtect cannot be false while ' +
        'goog.debug.ErrorReporter.ALLOW_AUTO_PROTECT is false.  Setting ' +
        'ALLOW_AUTO_PROTECT to false removes the necessary auto-protect code ' +
        'in compiled/optimized mode.');
  }
};
goog.inherits(goog.debug.ErrorReporter, goog.events.EventTarget);


/**
 * @define {boolean} If true, the code that provides additional entry point
 *     protection and setup is exposed in this file.  Set to false to avoid
 *     bringing in a lot of code from ErrorHandler and entryPointRegistry in
 *     compiled mode.
 */
goog.debug.ErrorReporter.ALLOW_AUTO_PROTECT =
    goog.define('goog.debug.ErrorReporter.ALLOW_AUTO_PROTECT', true);



/**
 * Event broadcast when an exception is logged.
 * @param {Error} error The exception that was was reported.
 * @param {!Object<string, string>} context The context values sent to the
 *     server alongside this error.
 * @constructor
 * @extends {goog.events.Event}
 * @final
 */
goog.debug.ErrorReporter.ExceptionEvent = function(error, context) {
  'use strict';
  goog.events.Event.call(this, goog.debug.ErrorReporter.ExceptionEvent.TYPE);

  /**
   * The error that was reported.
   * @type {Error}
   */
  this.error = error;

  /**
   * Context values sent to the server alongside this report.
   * @type {!Object<string, string>}
   */
  this.context = context;
};
goog.inherits(goog.debug.ErrorReporter.ExceptionEvent, goog.events.Event);


/**
 * Event type for notifying of a logged exception.
 * @type {string}
 */
goog.debug.ErrorReporter.ExceptionEvent.TYPE =
    goog.events.getUniqueId('exception');


/**
 * Extra headers for the error-reporting XHR.
 * @type {Object|!Map<string, string>|undefined}
 * @private
 */
goog.debug.ErrorReporter.prototype.extraHeaders_;


/**
 * Logging object.
 *
 * @type {goog.log.Logger}
 * @private
 */
goog.debug.ErrorReporter.logger_ =
    goog.log.getLogger('goog.debug.ErrorReporter');


/**
 * Installs an error reporter to catch all JavaScript errors raised.
 *
 * @param {string} loggingUrl The URL to which the errors caught will be
 *     reported.
 * @param {function(!Error, !Object<string, string>)=}
 *     opt_contextProvider When a report is to be sent to the server,
 *     this method will be called, and given an opportunity to modify the
 *     context object before submission to the server.
 * @param {boolean=} opt_noAutoProtect Whether to automatically add handlers for
 *     onerror and to protect entry points.  If apps have other error reporting
 *     facilities, it may make sense for them to set these up themselves and use
 *     the ErrorReporter just for transmission of reports.
 * @return {!goog.debug.ErrorReporter} The error reporter.
 */
goog.debug.ErrorReporter.install = function(
    loggingUrl, opt_contextProvider, opt_noAutoProtect) {
  'use strict';
  var instance = new goog.debug.ErrorReporter(
      loggingUrl, opt_contextProvider, opt_noAutoProtect);
  return instance;
};


/**
 * Default implementation of XHR sender interface.
 *
 * @param {string} uri URI to make request to.
 * @param {string} method Send method.
 * @param {string} content Post data.
 * @param {Object|!Map<string, string>=} opt_headers Map of headers to add to
 *     the request.
 */
goog.debug.ErrorReporter.defaultXhrSender = function(
    uri, method, content, opt_headers) {
  'use strict';
  let headersObj;
  if (opt_headers instanceof Map) {
    headersObj = {};
    for (const [key, value] of opt_headers) {
      headersObj[key] = value;
    }
  } else {
    headersObj = opt_headers;
  }
  goog.net.XhrIo.send(uri, null, method, content, headersObj);
};


/**
 * Installs exception protection for an entry point function in addition
 * to those that are protected by default.
 * Has no effect in IE because window.onerror is used for reporting
 * exceptions in that case.
 *
 * @this {goog.debug.ErrorReporter}
 * @param {!Function} fn An entry point function to be protected.
 * @return {Function} A protected wrapper function that calls the entry point
 *     function or null if the entry point could not be protected.
 */
goog.debug.ErrorReporter.prototype.protectAdditionalEntryPoint =
    goog.debug.ErrorReporter.ALLOW_AUTO_PROTECT ? function(fn) {
      'use strict';
      if (this.errorHandler_) {
        return this.errorHandler_.protectEntryPoint(fn);
      }
      return null;
    } : function(fn) {
      'use strict';
      goog.asserts.fail(
          'Cannot call protectAdditionalEntryPoint while ALLOW_AUTO_PROTECT ' +
          'is false.  If ALLOW_AUTO_PROTECT is false, the necessary ' +
          'auto-protect code in compiled/optimized mode is removed.');
      return null;
    };


if (goog.debug.ErrorReporter.ALLOW_AUTO_PROTECT) {
  /**
   * Sets up the error reporter.
   *
   * @private
   */
  goog.debug.ErrorReporter.prototype.setup_ = function() {
    'use strict';
    // "onerror" doesn't work with FF2 or Chrome
    this.errorHandler_ =
        new goog.debug.ErrorHandler(goog.bind(this.handleException, this));

    this.errorHandler_.protectWindowSetTimeout();
    this.errorHandler_.protectWindowSetInterval();
    this.errorHandler_.protectWindowRequestAnimationFrame();
    goog.debug.entryPointRegistry.monitorAll(this.errorHandler_);
  };
}


/**
 * Add headers to the logging url.
 * @param {Object|!Map<string, string>} loggingHeaders Extra headers to send
 *     to the logging URL.
 */
goog.debug.ErrorReporter.prototype.setLoggingHeaders = function(
    loggingHeaders) {
  'use strict';
  this.extraHeaders_ = loggingHeaders;
};


/**
 * Set the function used to send error reports to the server.
 * @param {function(string, string, string, (Object|!Map<string, string>)=)}
 *     xhrSender If provided, this will be used to send a report to the
 *     server instead of the default method. The function will be given the URI,
 *     HTTP method request content, and (optionally) request headers to be
 *     added.
 */
goog.debug.ErrorReporter.prototype.setXhrSender = function(xhrSender) {
  'use strict';
  this.xhrSender_ = xhrSender;
};


/**
 * Handler for caught exceptions. Sends report to the LoggingServlet and
 * notifies any listeners.
 *
 * @param {Object} e The exception.
 * @param {!Object<string, string>=} opt_context Context values to optionally
 *     include in the error report.
 * @suppress {strictMissingProperties} error is not defined on Object
 */
goog.debug.ErrorReporter.prototype.handleException = function(e, opt_context) {
  'use strict';
  // goog.debug.catchErrors passes the actual error object (in some browsers) in
  // the error property. If we have that, use that instead of the incomplete set
  // of random properties passed to window.onerror.
  e = e.error || e;
  // Construct the context, possibly from the one provided in the argument, and
  // pass it to the context provider if there is one.
  var context = opt_context ? goog.object.clone(opt_context) : {};
  if (e instanceof Error) {
    goog.object.extend(
        context,
        goog.debug.errorcontext.getErrorContext(/** @type {!Error} */ (e)));
  }

  var error = /** @type {!Error} */ (goog.debug.normalizeErrorObject(e));

  if (this.contextProvider_) {
    try {
      this.contextProvider_(error, context);
    } catch (err) {
      goog.log.error(
          goog.debug.ErrorReporter.logger_,
          'Context provider threw an exception: ' + err.message);
    }
  }
  // Truncate message to a reasonable length, since it will be sent in the URL.
  // The entire URL length historically needed to be 2,083 or less, so leave
  // some room for the rest of the URL.
  var message = error.message.substring(0, 1900);
  if (!(e instanceof goog.debug.Error) || e.reportErrorToServer) {
    this.sendErrorReport(
        message, error.fileName, error.lineNumber, error.stack, context);
  }

  try {
    this.dispatchEvent(
        new goog.debug.ErrorReporter.ExceptionEvent(error, context));
  } catch (ex) {
    // Swallow exception to avoid infinite recursion.
  }
};


/**
 * Sends an error report to the logging URL.  This will not consult the context
 * provider, the report will be sent exactly as specified.
 *
 * @param {string} message Error description.
 * @param {string} fileName URL of the JavaScript file with the error.
 * @param {number} line Line number of the error.
 * @param {string=} opt_trace Call stack trace of the error.
 * @param {!Object<string, string>=} opt_context Context information to include
 *     in the request.
 */
goog.debug.ErrorReporter.prototype.sendErrorReport = function(
    message, fileName, line, opt_trace, opt_context) {
  'use strict';
  try {
    // Create the logging URL.
    var requestUrl = goog.uri.utils.appendParams(
        this.handlerUrl_, 'script', fileName, 'error', message, 'line', line);

    if (!goog.object.isEmpty(this.additionalArguments_)) {
      requestUrl = goog.uri.utils.appendParamsFromMap(
          requestUrl, this.additionalArguments_);
    }

    var queryMap = {};
    queryMap['trace'] = opt_trace;

    // Copy context into query data map
    if (opt_context) {
      for (var entry in opt_context) {
        queryMap[this.contextPrefix_ + entry] = opt_context[entry];
      }
    }

    // Copy query data map into request.
    var queryData = goog.uri.utils.buildQueryDataFromMap(queryMap);

    // Truncate if truncationLimit set.
    if (typeof this.truncationLimit_ === 'number') {
      queryData = queryData.substring(0, this.truncationLimit_);
    }

    // Send the request with the contents of the error.
    this.xhrSender_(requestUrl, 'POST', queryData, this.extraHeaders_);
  } catch (e) {
    var logMessage = 'Error occurred in sending an error report.\n\n' +
        'script:' + fileName + '\n' +
        'line:' + line + '\n' +
        'error:' + message + '\n' +
        'trace:' + opt_trace;
    goog.log.info(goog.debug.ErrorReporter.logger_, logMessage);
  }
};


/**
 * @param {string} prefix The prefix to appear prepended to all context
 *     variables in the error report body.
 */
goog.debug.ErrorReporter.prototype.setContextPrefix = function(prefix) {
  'use strict';
  this.contextPrefix_ = prefix;
};


/**
 * @param {?number} limit Size in bytes to begin truncating POST body.  Set to
 *     null to prevent truncation.  The limit must be >= 0.
 */
goog.debug.ErrorReporter.prototype.setTruncationLimit = function(limit) {
  'use strict';
  goog.asserts.assert(
      typeof limit !== 'number' || limit >= 0,
      'Body limit must be valid number >= 0 or null');
  this.truncationLimit_ = limit;
};


/**
 * @param {!Object<string,string>} urlArgs Set of key-value pairs to append
 *     to handlerUrl_ before sending XHR.
 */
goog.debug.ErrorReporter.prototype.setAdditionalArguments = function(urlArgs) {
  'use strict';
  this.additionalArguments_ = urlArgs;
};


/** @override */
goog.debug.ErrorReporter.prototype.disposeInternal = function() {
  'use strict';
  if (goog.debug.ErrorReporter.ALLOW_AUTO_PROTECT) {
    goog.dispose(this.errorHandler_);
  }
  goog.debug.ErrorReporter.base(this, 'disposeInternal');
};
