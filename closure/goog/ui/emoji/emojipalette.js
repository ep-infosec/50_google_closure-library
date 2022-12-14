/**
 * @license
 * Copyright The Closure Library Authors.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Emoji Palette implementation. This provides a UI widget for
 * choosing an emoji from a palette of possible choices. EmojiPalettes are
 * contained within EmojiPickers.
 *
 * See ../demos/popupemojipicker.html for an example of how to instantiate
 * an emoji picker.
 *
 * Based on goog.ui.ColorPicker (colorpicker.js).
 */

goog.provide('goog.ui.emoji.EmojiPalette');

goog.require('goog.events.EventType');
goog.require('goog.net.ImageLoader');
goog.require('goog.ui.Palette');
goog.require('goog.ui.emoji.Emoji');
goog.require('goog.ui.emoji.EmojiPaletteRenderer');
goog.requireType('goog.dom.DomHelper');
goog.requireType('goog.events.Event');
goog.requireType('goog.ui.PaletteRenderer');



/**
 * A page of emoji to be displayed in an EmojiPicker.
 *
 * @param {Array<Array<?>>} emoji List of emoji for this page.
  * @param {?string=} opt_urlPrefix Prefix that should be prepended to all URL.
 * @param {goog.ui.PaletteRenderer=} opt_renderer Renderer used to render or
 *     decorate the palette; defaults to {@link goog.ui.PaletteRenderer}.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @extends {goog.ui.Palette}
 * @constructor
 * @final
 */
goog.ui.emoji.EmojiPalette = function(
    emoji, opt_urlPrefix, opt_renderer, opt_domHelper) {
  'use strict';
  goog.ui.Palette.call(
      this, null, opt_renderer || new goog.ui.emoji.EmojiPaletteRenderer(null),
      opt_domHelper);
  /**
   * All the different emoji that this palette can display. Maps emoji ids
   * (string) to the goog.ui.emoji.Emoji for that id.
   *
   * @type {Object}
   * @private
   */
  this.emojiCells_ = {};

  /**
   * Map of emoji id to index into this.emojiCells_.
   *
   * @type {Object}
   * @private
   */
  this.emojiMap_ = {};

  /**
   * List of the animated emoji in this palette. Each internal array is of type
   * [HTMLDivElement, goog.ui.emoji.Emoji], and represents the palette item
   * for that animated emoji, and the Emoji object.
   *
   * @type {Array<Array<(HTMLDivElement|goog.ui.emoji.Emoji)>>}
   * @private
   */
  this.animatedEmoji_ = [];

  this.urlPrefix_ = opt_urlPrefix || '';

  /**
   * Palette items that are displayed on this page of the emoji picker. Each
   * item is a div wrapped around a div or an img.
   *
   * @type {Array<HTMLDivElement>}
   * @private
   */
  this.emoji_ = this.getEmojiArrayFromProperties_(emoji);

  this.setContent(this.emoji_);
};
goog.inherits(goog.ui.emoji.EmojiPalette, goog.ui.Palette);


/**
 * Indicates a prefix that should be prepended to all URLs of images in this
 * emojipalette. This provides an optimization if the URLs are long, so that
 * the client does not have to send a long string for each emoji.
 *
 * @type {string}
 * @private
 */
goog.ui.emoji.EmojiPalette.prototype.urlPrefix_ = '';


/**
 * Whether the emoji images have been loaded.
 *
 * @type {boolean}
 * @private
 */
goog.ui.emoji.EmojiPalette.prototype.imagesLoaded_ = false;


/**
 * Image loader for loading animated emoji.
 *
 * @type {goog.net.ImageLoader}
 * @private
 */
goog.ui.emoji.EmojiPalette.prototype.imageLoader_;


/**
 * Helps create an array of emoji palette items from an array of emoji
 * properties. Each element will be either a div with background-image set to
 * a sprite, or an img element pointing directly to an emoji, and all elements
 * are wrapped with an outer div for alignment issues (i.e., this allows
 * centering the inner div).
 *
 * @param {Object} emojiGroup The group of emoji for this page.
 * @return {!Array<!HTMLDivElement>} The emoji items.
 * @private
 * @suppress {strictMissingProperties} Added to tighten compiler checks
 */
goog.ui.emoji.EmojiPalette.prototype.getEmojiArrayFromProperties_ = function(
    emojiGroup) {
  'use strict';
  const emojiItems = [];

  for (let i = 0; i < emojiGroup.length; i++) {
    const url = emojiGroup[i][0];
    const id = emojiGroup[i][1];
    const spriteInfo = emojiGroup[i][2];
    const displayUrl = spriteInfo ? spriteInfo.getUrl() : this.urlPrefix_ + url;

    /** @suppress {strictMissingProperties} Added to tighten compiler checks */
    const item = this.getRenderer().createPaletteItem(
        this.getDomHelper(), id, spriteInfo, displayUrl);
    emojiItems.push(item);

    const emoji = new goog.ui.emoji.Emoji(url, id);
    this.emojiCells_[id] = emoji;
    this.emojiMap_[id] = i;

    // Keep track of sprited emoji that are animated, for later loading.
    if (spriteInfo && spriteInfo.isAnimated()) {
      this.animatedEmoji_.push([item, emoji]);
    }
  }

  // Create the image loader now so that tests can access it before it has
  // started loading images.
  if (this.animatedEmoji_.length > 0) {
    this.imageLoader_ = new goog.net.ImageLoader();
  }

  this.imagesLoaded_ = true;
  return emojiItems;
};


/**
 * Sends off requests for all the animated emoji and replaces their static
 * sprites when the images are done downloading.
 */
goog.ui.emoji.EmojiPalette.prototype.loadAnimatedEmoji = function() {
  'use strict';
  if (this.animatedEmoji_.length > 0) {
    for (let i = 0; i < this.animatedEmoji_.length; i++) {
      const emoji =
          /** @type {goog.ui.emoji.Emoji} */ (this.animatedEmoji_[i][1]);
      const url = this.urlPrefix_ + emoji.getUrl();

      this.imageLoader_.addImage(emoji.getId(), url);
    }

    this.getHandler().listen(
        this.imageLoader_, goog.events.EventType.LOAD, this.handleImageLoad_);
    this.imageLoader_.start();
  }
};


/**
 * Handles image load events from the ImageLoader.
 *
 * @param {goog.events.Event} e The event object.
 * @private
 * @suppress {strictMissingProperties} Added to tighten compiler checks
 */
goog.ui.emoji.EmojiPalette.prototype.handleImageLoad_ = function(e) {
  'use strict';
  /** @suppress {strictMissingProperties} Added to tighten compiler checks */
  const id = e.target.id;
  /** @suppress {strictMissingProperties} Added to tighten compiler checks */
  const url = e.target.src;
  // Just to be safe, we check to make sure we have an id and src url from
  // the event target, which the ImageLoader sets to an Image object.
  if (id && url) {
    const item = this.emoji_[this.emojiMap_[id]];
    if (item) {
      this.getRenderer().updateAnimatedPaletteItem(item, e.target);
    }
  }
};


/**
 * Returns the image loader that this palette uses. Used for testing.
 *
 * @return {goog.net.ImageLoader} the image loader.
 */
goog.ui.emoji.EmojiPalette.prototype.getImageLoader = function() {
  'use strict';
  return this.imageLoader_;
};


/** @override */
goog.ui.emoji.EmojiPalette.prototype.disposeInternal = function() {
  'use strict';
  goog.ui.emoji.EmojiPalette.superClass_.disposeInternal.call(this);

  if (this.imageLoader_) {
    this.imageLoader_.dispose();
    this.imageLoader_ = null;
  }
  this.animatedEmoji_ = null;
  this.emojiCells_ = null;
  this.emojiMap_ = null;
  this.emoji_ = null;
};


/**
 * Returns a goomoji id from an img or the containing td, or null if none
 * exists for that element.
 *
 * @param {Element} el The element to get the Goomoji id from.
 * @return {?string} A goomoji id from an img or the containing td, or null if
 *     none exists for that element.
 * @private
 */
goog.ui.emoji.EmojiPalette.prototype.getGoomojiIdFromElement_ = function(el) {
  'use strict';
  if (!el) {
    return null;
  }

  /** @suppress {strictMissingProperties} Added to tighten compiler checks */
  const item = this.getRenderer().getContainingItem(this, el);
  if (item) {
    return item.getAttribute(goog.ui.emoji.Emoji.ATTRIBUTE) != '' ?
        item.getAttribute(goog.ui.emoji.Emoji.ATTRIBUTE) :
        item.getAttribute(goog.ui.emoji.Emoji.DATA_ATTRIBUTE);
  }
  return null;
};


/**
 * @return {goog.ui.emoji.Emoji} The currently selected emoji from this palette.
 */
goog.ui.emoji.EmojiPalette.prototype.getSelectedEmoji = function() {
  'use strict';
  const elem = /** @type {Element} */ (this.getSelectedItem());
  const goomojiId = this.getGoomojiIdFromElement_(elem);
  return this.emojiCells_[goomojiId];
};


/**
 * @return {number} The number of emoji managed by this palette.
 * @suppress {strictMissingProperties} Added to tighten compiler checks
 */
goog.ui.emoji.EmojiPalette.prototype.getNumberOfEmoji = function() {
  'use strict';
  return this.emojiCells_.length;
};


/**
 * Returns the index of the specified emoji within this palette.
 *
 * @param {string} id Id of the emoji to look up.
 * @return {number} The index of the specified emoji within this palette.
 */
goog.ui.emoji.EmojiPalette.prototype.getEmojiIndex = function(id) {
  'use strict';
  return this.emojiMap_[id];
};
