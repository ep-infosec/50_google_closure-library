/**
 * @license
 * Copyright The Closure Library Authors.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Emoji Palette renderer implementation.
 * @suppress {checkPrototypalTypes}
 */

goog.provide('goog.ui.emoji.EmojiPaletteRenderer');

goog.require('goog.a11y.aria');
goog.require('goog.asserts');
goog.require('goog.dom.NodeType');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classlist');
goog.require('goog.style');
goog.require('goog.ui.PaletteRenderer');
goog.require('goog.ui.emoji.Emoji');
goog.requireType('goog.dom.DomHelper');
goog.requireType('goog.ui.Palette');
goog.requireType('goog.ui.emoji.SpriteInfo');



/**
 * Renders an emoji palette.
 *
 * @param {?string} defaultImgUrl Url of the img that should be used to fill up
 *     the cells in the emoji table, to prevent jittering. Will be stretched
 *     to the emoji cell size. A good image is a transparent dot.
 * @constructor
 * @extends {goog.ui.PaletteRenderer}
 */
goog.ui.emoji.EmojiPaletteRenderer = function(defaultImgUrl) {
  'use strict';
  goog.ui.PaletteRenderer.call(this);

  this.defaultImgUrl_ = defaultImgUrl;
};
goog.inherits(goog.ui.emoji.EmojiPaletteRenderer, goog.ui.PaletteRenderer);


/**
 * Globally unique ID sequence for cells rendered by this renderer class.
 * @type {number}
 * @private
 */
goog.ui.emoji.EmojiPaletteRenderer.cellId_ = 0;


/**
 * Url of the img that should be used for cells in the emoji palette that are
 * not filled with emoji, i.e., after all the emoji have already been placed
 * on a page.
 *
 * @type {?string}
 * @private
 */
goog.ui.emoji.EmojiPaletteRenderer.prototype.defaultImgUrl_ = null;


/** @override */
goog.ui.emoji.EmojiPaletteRenderer.getCssClass = function() {
  'use strict';
  return goog.getCssName('goog-ui-emojipalette');
};


/**
 * Creates a palette item from the given emoji data.
 *
 * @param {goog.dom.DomHelper} dom DOM helper for constructing DOM elements.
 * @param {string} id Goomoji id for the emoji.
 * @param {goog.ui.emoji.SpriteInfo} spriteInfo Spriting info for the emoji.
 * @param {string} displayUrl URL of the image served for this cell, whether
 *     an individual emoji image or a sprite.
 * @return {!HTMLDivElement} The palette item for this emoji.
 */
goog.ui.emoji.EmojiPaletteRenderer.prototype.createPaletteItem = function(
    dom, id, spriteInfo, displayUrl) {
  'use strict';
  let el;

  if (spriteInfo) {
    const cssClass = spriteInfo.getCssClass();
    if (cssClass) {
      el = dom.createDom(goog.dom.TagName.DIV, cssClass);
    } else {
      el = this.buildElementFromSpriteMetadata(dom, spriteInfo, displayUrl);
    }
  } else {
    el = dom.createDom(goog.dom.TagName.IMG, {'src': displayUrl});
  }

  const outerdiv = dom.createDom(
      goog.dom.TagName.DIV, goog.getCssName('goog-palette-cell-wrapper'), el);
  outerdiv.setAttribute(goog.ui.emoji.Emoji.ATTRIBUTE, id);
  outerdiv.setAttribute(goog.ui.emoji.Emoji.DATA_ATTRIBUTE, id);
  return /** @type {!HTMLDivElement} */ (outerdiv);
};


/**
 * Modifies a palette item containing an animated emoji, in response to the
 * animated emoji being successfully downloaded.
 *
 * @param {Element} item The palette item to update.
 * @param {Image} animatedImg An Image object containing the animated emoji.
 */
goog.ui.emoji.EmojiPaletteRenderer.prototype.updateAnimatedPaletteItem =
    function(item, animatedImg) {
  'use strict';
  // An animated emoji is one that had sprite info for a static version and is
  // now being updated. See createPaletteItem for the structure of the palette
  // items we're modifying.

  const inner = /** @type {Element} */ (item.firstChild);
  goog.asserts.assert(inner);
  // The first case is a palette item with a CSS class representing the sprite,
  // and an animated emoji.
  const classes = goog.dom.classlist.get(inner);
  if (classes && classes.length == 1) {
    inner.className = '';
  }

  goog.style.setStyle(inner, {
    'width': animatedImg.width,
    'height': animatedImg.height,
    'background-image': 'url(' + animatedImg.src + ')',
    'background-position': '0 0'
  });
};


/**
 * Builds the inner contents of a palette item out of sprite metadata.
 *
 * @param {goog.dom.DomHelper} dom DOM helper for constructing DOM elements.
 * @param {goog.ui.emoji.SpriteInfo} spriteInfo The metadata to create the css
 *     for the sprite.
 * @param {string} displayUrl The URL of the image for this cell.
 * @return {!HTMLDivElement} The inner element for a palette item.
 */
goog.ui.emoji.EmojiPaletteRenderer.prototype.buildElementFromSpriteMetadata =
    function(dom, spriteInfo, displayUrl) {
  'use strict';
  const width = spriteInfo.getWidthCssValue();
  const height = spriteInfo.getHeightCssValue();
  const x = spriteInfo.getXOffsetCssValue();
  const y = spriteInfo.getYOffsetCssValue();

  const el = dom.createDom(goog.dom.TagName.DIV);
  goog.style.setStyle(el, {
    'width': width,
    'height': height,
    'background-image': 'url(' + displayUrl + ')',
    'background-repeat': 'no-repeat',
    'background-position': x + ' ' + y
  });

  return /** @type {!HTMLDivElement} */ (el);
};


/** @override */
goog.ui.emoji.EmojiPaletteRenderer.prototype.createCell = function(node, dom) {
  'use strict';
  // Create a cell with  the default img if we're out of items, in order to
  // prevent jitter in the table. If there's no default img url, just create an
  // empty div, to prevent trying to fetch a null url.
  if (!node) {
    const elem = this.defaultImgUrl_ ?
        dom.createDom(goog.dom.TagName.IMG, {src: this.defaultImgUrl_}) :
        dom.createDom(goog.dom.TagName.DIV);
    node = dom.createDom(
        goog.dom.TagName.DIV, goog.getCssName('goog-palette-cell-wrapper'),
        elem);
  }

  const cell = dom.createDom(
      goog.dom.TagName.TD, {
        'class': goog.getCssName(this.getCssClass(), 'cell'),
        // Cells must have an ID, for accessibility, so we generate one here.
        'id': this.getCssClass() + '-cell-' +
            goog.ui.emoji.EmojiPaletteRenderer.cellId_++
      },
      node);
  goog.a11y.aria.setRole(cell, 'gridcell');
  return cell;
};


/**
 * Returns the item corresponding to the given node, or null if the node is
 * neither a palette cell nor part of a palette item.
 * @param {goog.ui.Palette} palette Palette in which to look for the item.
 * @param {Node} node Node to look for.
 * @return {Node} The corresponding palette item (null if not found).
 * @override
 * @suppress {strictMissingProperties} Added to tighten compiler checks
 */
goog.ui.emoji.EmojiPaletteRenderer.prototype.getContainingItem = function(
    palette, node) {
  'use strict';
  const root = palette.getElement();
  while (node && node.nodeType == goog.dom.NodeType.ELEMENT && node != root) {
    if (node.tagName == goog.dom.TagName.TD) {
      return node.firstChild;
    }
    node = node.parentNode;
  }

  return null;
};
