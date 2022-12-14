/**
 * @license
 * Copyright The Closure Library Authors.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview An HSVA (hue/saturation/value/alpha) color palette/picker
 * implementation.
 * Without the styles from the demo css file, only a hex color label and input
 * field show up.
 *
 * @see ../demos/hsvapalette.html
 */

goog.provide('goog.ui.HsvaPalette');

goog.require('goog.array');
goog.require('goog.color.alpha');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.style');
goog.require('goog.ui.Component');
goog.require('goog.ui.HsvPalette');
goog.requireType('goog.dom.DomHelper');
goog.requireType('goog.events.Event');
goog.requireType('goog.math.Rect');



/**
 * Creates an HSVA palette. Allows a user to select the hue, saturation,
 * value/brightness and alpha/opacity.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @param {string=} opt_color Optional initial color, without alpha (default is
 *     red).
 * @param {number=} opt_alpha Optional initial alpha (default is 1).
 * @param {string=} opt_class Optional base for creating classnames (default is
 *     'goog-hsva-palette').
 * @extends {goog.ui.HsvPalette}
 * @constructor
 * @final
 */
goog.ui.HsvaPalette = function(opt_domHelper, opt_color, opt_alpha, opt_class) {
  'use strict';
  goog.ui.HsvaPalette.base(
      this, 'constructor', opt_domHelper, opt_color, opt_class);

  /**
   * Alpha transparency of the currently selected color, in [0, 1]. When
   * undefined, the palette will behave as a non-transparent HSV palette,
   * assuming full opacity.
   * @type {number}
   * @private
   */
  this.alpha_ = (opt_alpha !== undefined) ? opt_alpha : 1;

  /**
   * @override
   */
  this.className = opt_class || goog.getCssName('goog-hsva-palette');
};
goog.inherits(goog.ui.HsvaPalette, goog.ui.HsvPalette);


/**
 * DOM element representing the alpha background image.
 * @type {HTMLElement}
 * @private
 */
goog.ui.HsvaPalette.prototype.aImageEl_;


/**
 * DOM element representing the alpha handle.
 * @type {HTMLElement}
 * @private
 */
goog.ui.HsvaPalette.prototype.aHandleEl_;


/**
 * DOM element representing the swatch backdrop image.
 * @type {Element}
 * @private
 */
goog.ui.HsvaPalette.prototype.swatchBackdropEl_;


/** @override */
goog.ui.HsvaPalette.prototype.getAlpha = function() {
  'use strict';
  return this.alpha_;
};


/**
 * Sets which color is selected and update the UI. The passed color should be
 * in #rrggbb format. The alpha value will be set to 1.
 * @param {number} alpha The selected alpha value, in [0, 1].
 */
goog.ui.HsvaPalette.prototype.setAlpha = function(alpha) {
  'use strict';
  this.setColorAlphaHelper_(this.color, alpha);
};


/**
 * Sets which color is selected and update the UI. The passed color should be
 * in #rrggbb format. The alpha value will be set to 1.
 * @param {string} color The selected color.
 * @override
 */
goog.ui.HsvaPalette.prototype.setColor = function(color) {
  'use strict';
  this.setColorAlphaHelper_(color, 1);
};


/**
 * Gets the color that is currently selected in this color picker, in #rrggbbaa
 * format.
 * @return {string} The string of the selected color with alpha.
 */
goog.ui.HsvaPalette.prototype.getColorRgbaHex = function() {
  'use strict';
  var alphaHex = Math.floor(this.alpha_ * 255).toString(16);
  return this.color + (alphaHex.length == 1 ? '0' + alphaHex : alphaHex);
};


/**
 * Sets which color is selected and update the UI. The passed color should be
 * in #rrggbbaa format. The alpha value will be set to 1.
 * @param {string} color The selected color with alpha.
 */
goog.ui.HsvaPalette.prototype.setColorRgbaHex = function(color) {
  'use strict';
  var parsed = goog.ui.HsvaPalette.parseColorRgbaHex_(color);
  this.setColorAlphaHelper_(parsed[0], parsed[1]);
};


/**
 * Sets which color and alpha value are selected and update the UI. The passed
 * color should be in #rrggbb format.
 * @param {string} color The selected color in #rrggbb format.
 * @param {number} alpha The selected alpha value, in [0, 1].
 * @private
 */
goog.ui.HsvaPalette.prototype.setColorAlphaHelper_ = function(color, alpha) {
  'use strict';
  var colorChange = this.color != color;
  var alphaChange = this.alpha_ != alpha;
  this.alpha_ = alpha;
  this.color = color;
  if (colorChange) {
    // This is to prevent multiple event dispatches.
    this.setColorInternal(color);
  }
  if (colorChange || alphaChange) {
    this.updateUi();
    this.dispatchEvent(goog.ui.Component.EventType.ACTION);
  }
};


/** @override */
goog.ui.HsvaPalette.prototype.createDom = function() {
  'use strict';
  goog.ui.HsvaPalette.base(this, 'createDom');

  var dom = this.getDomHelper();
  this.aImageEl_ = /** @type {!HTMLElement} */ (
      dom.createDom(
          goog.dom.TagName.DIV, goog.getCssName(this.className, 'a-image')));
  this.aHandleEl_ = /** @type {!HTMLElement} */ (
      dom.createDom(
          goog.dom.TagName.DIV, goog.getCssName(this.className, 'a-handle')));
  this.swatchBackdropEl_ = dom.createDom(
      goog.dom.TagName.DIV, goog.getCssName(this.className, 'swatch-backdrop'));
  var element = this.getElement();
  dom.appendChild(element, this.aImageEl_);
  dom.appendChild(element, this.aHandleEl_);
  dom.appendChild(element, this.swatchBackdropEl_);
};


/** @override */
goog.ui.HsvaPalette.prototype.disposeInternal = function() {
  'use strict';
  goog.ui.HsvaPalette.base(this, 'disposeInternal');

  delete this.aImageEl_;
  delete this.aHandleEl_;
  delete this.swatchBackdropEl_;
};


/** @override */
goog.ui.HsvaPalette.prototype.updateUi = function() {
  'use strict';
  goog.ui.HsvaPalette.base(this, 'updateUi');
  if (this.isInDocument()) {
    var a = this.alpha_ * 255;
    var top = this.aImageEl_.offsetTop -
        Math.floor(this.aHandleEl_.offsetHeight / 2) +
        this.aImageEl_.offsetHeight * ((255 - a) / 255);
    this.aHandleEl_.style.top = top + 'px';
    this.aImageEl_.style.backgroundColor = this.color;
    goog.style.setOpacity(this.swatchElement, a / 255);
  }
};


/**
 * @override
 * @suppress {strictMissingProperties} Added to tighten compiler checks
 */
goog.ui.HsvaPalette.prototype.updateInput = function() {
  'use strict';
  if (!goog.array.equals(
          [this.color, this.alpha_],
          goog.ui.HsvaPalette.parseUserInput_(this.inputElement.value))) {
    /** @suppress {strictMissingProperties} Added to tighten compiler checks */
    this.inputElement.value = this.getColorRgbaHex();
  }
};


/** @override */
goog.ui.HsvaPalette.prototype.handleMouseDown = function(e) {
  'use strict';
  goog.ui.HsvaPalette.base(this, 'handleMouseDown', e);
  if (e.target == this.aImageEl_ || e.target == this.aHandleEl_) {
    // Setup value change listeners
    var b = goog.style.getBounds(this.valueBackgroundImageElement);
    this.handleMouseMoveA_(b, e);
    this.mouseMoveListener = goog.events.listen(
        this.getDomHelper().getDocument(), goog.events.EventType.MOUSEMOVE,
        goog.bind(this.handleMouseMoveA_, this, b));
    this.mouseUpListener = goog.events.listen(
        this.getDomHelper().getDocument(), goog.events.EventType.MOUSEUP,
        this.handleMouseUp, false, this);
  }
};


/**
 * Handles mousemove events on the document once a drag operation on the alpha
 * slider has started.
 * @param {goog.math.Rect} b Boundaries of the value slider object at the start
 *     of the drag operation.
 * @param {goog.events.Event} e Event object.
 * @private
 */
goog.ui.HsvaPalette.prototype.handleMouseMoveA_ = function(b, e) {
  'use strict';
  e.preventDefault();
  var vportPos = this.getDomHelper().getDocumentScroll();
  /** @suppress {strictMissingProperties} Added to tighten compiler checks */
  var newA =
      (b.top + b.height -
       Math.min(Math.max(vportPos.y + e.clientY, b.top), b.top + b.height)) /
      b.height;
  this.setAlpha(newA);
};


/** @override */
goog.ui.HsvaPalette.prototype.handleInput = function(e) {
  'use strict';
  /** @suppress {strictMissingProperties} Added to tighten compiler checks */
  var parsed = goog.ui.HsvaPalette.parseUserInput_(this.inputElement.value);
  if (parsed) {
    this.setColorAlphaHelper_(parsed[0], parsed[1]);
  }
};


/**
 * Parses an #rrggbb or #rrggbbaa color string.
 * @param {string} value User-entered color value.
 * @return {Array<?>} A two element array [color, alpha], where color is
 *     #rrggbb and alpha is in [0, 1]. Null if the argument was invalid.
 * @private
 */
goog.ui.HsvaPalette.parseUserInput_ = function(value) {
  'use strict';
  if (/^#?[0-9a-f]{8}$/i.test(value)) {
    return goog.ui.HsvaPalette.parseColorRgbaHex_(value);
  } else if (/^#?[0-9a-f]{6}$/i.test(value)) {
    return [value, 1];
  }
  return null;
};


/**
 * Parses a #rrggbbaa color string.
 * @param {string} color The color and alpha in #rrggbbaa format.
 * @return {!Array<?>} A two element array [color, alpha], where color is
 *     #rrggbb and alpha is in [0, 1].
 * @private
 */
goog.ui.HsvaPalette.parseColorRgbaHex_ = function(color) {
  'use strict';
  var hex = goog.color.alpha.parse(color).hex;
  return [
    goog.color.alpha.extractHexColor(hex),
    parseInt(goog.color.alpha.extractAlpha(hex), 16) / 255
  ];
};
