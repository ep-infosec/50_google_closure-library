/**
 * @license
 * Copyright The Closure Library Authors.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview TabPane widget implementation.
 */

goog.provide('goog.ui.TabPane');
goog.provide('goog.ui.TabPane.Events');
goog.provide('goog.ui.TabPane.TabLocation');
goog.provide('goog.ui.TabPane.TabPage');
goog.provide('goog.ui.TabPaneEvent');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classlist');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');
goog.require('goog.html.SafeStyleSheet');
goog.require('goog.style');
goog.requireType('goog.events.BrowserEvent');



/**
 * TabPane widget. All children already inside the tab pane container element
 * will be be converted to tabs. Each tab is represented by a goog.ui.TabPane.
 * TabPage object. Further pages can be constructed either from an existing
 * container or created from scratch.
 *
 * @param {Element} el Container element to create the tab pane out of.
 * @param {goog.ui.TabPane.TabLocation=} opt_tabLocation Location of the tabs
 *     in relation to the content container. Default is top.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @param {boolean=} opt_useMouseDown Whether to use MOUSEDOWN instead of CLICK
 *     for tab changes.
 * @extends {goog.events.EventTarget}
 * @constructor
 * @see ../demos/tabpane.html
 * @deprecated Use goog.ui.TabBar instead.
 */
goog.ui.TabPane = function(
    el, opt_tabLocation, opt_domHelper, opt_useMouseDown) {
  'use strict';
  goog.events.EventTarget.call(this);

  /**
   * DomHelper used to interact with the document, allowing components to be
   * created in a different window.  This property is considered protected;
   * subclasses of Component may refer to it directly.
   * @type {goog.dom.DomHelper}
   * @protected
   * @suppress {underscore|visibility}
   */
  this.dom_ = opt_domHelper || goog.dom.getDomHelper();

  /**
   * Tab pane element.
   * @type {Element}
   * @private
   */
  this.el_ = el;

  /**
   * Collection of tab panes.
   * @type {Array<goog.ui.TabPane.TabPage>}
   * @private
   */
  this.pages_ = [];

  /**
   * Location of the tabs with respect to the content box.
   * @type {goog.ui.TabPane.TabLocation}
   * @private
   */
  this.tabLocation_ =
      opt_tabLocation ? opt_tabLocation : goog.ui.TabPane.TabLocation.TOP;

  /**
   * Whether to use MOUSEDOWN instead of CLICK for tab change events. This
   * fixes some focus problems on Safari/Chrome.
   * @type {boolean}
   * @private
   */
  this.useMouseDown_ = !!opt_useMouseDown;

  this.create_();
};
goog.inherits(goog.ui.TabPane, goog.events.EventTarget);


/**
 * Element containing the tab buttons.
 * @type {Element}
 * @private
 */
goog.ui.TabPane.prototype.elButtonBar_;


/**
 * Element containing the tab pages.
 * @type {Element}
 * @private
 */
goog.ui.TabPane.prototype.elContent_;


/**
 * Selected page.
 * @type {goog.ui.TabPane.TabPage?}
 * @private
 */
goog.ui.TabPane.prototype.selected_;


/**
 * Constants for event names
 *
 * @const
 */
goog.ui.TabPane.Events = {
  /** @const {string} */
  CHANGE: 'change'
};


/**
 * Enum for representing the location of the tabs in relation to the content.
 *
 * @enum {number}
 */
goog.ui.TabPane.TabLocation = {
  TOP: 0,
  BOTTOM: 1,
  LEFT: 2,
  RIGHT: 3
};


/**
 * Creates HTML nodes for tab pane.
 *
 * @private
 */
goog.ui.TabPane.prototype.create_ = function() {
  'use strict';
  this.el_.className = goog.getCssName('goog-tabpane');

  var nodes = this.getChildNodes_();

  // Create tab strip
  this.elButtonBar_ = this.dom_.createDom(
      goog.dom.TagName.UL,
      {'className': goog.getCssName('goog-tabpane-tabs'), 'tabIndex': '0'});

  // Create content area
  this.elContent_ = this.dom_.createDom(
      goog.dom.TagName.DIV, goog.getCssName('goog-tabpane-cont'));
  this.el_.appendChild(this.elContent_);

  var element = goog.asserts.assertElement(this.el_);

  switch (this.tabLocation_) {
    case goog.ui.TabPane.TabLocation.TOP:
      element.insertBefore(this.elButtonBar_, this.elContent_);
      element.insertBefore(this.createClear_(), this.elContent_);
      goog.dom.classlist.add(element, goog.getCssName('goog-tabpane-top'));
      break;
    case goog.ui.TabPane.TabLocation.BOTTOM:
      element.appendChild(this.elButtonBar_);
      element.appendChild(this.createClear_());
      goog.dom.classlist.add(element, goog.getCssName('goog-tabpane-bottom'));
      break;
    case goog.ui.TabPane.TabLocation.LEFT:
      element.insertBefore(this.elButtonBar_, this.elContent_);
      goog.dom.classlist.add(element, goog.getCssName('goog-tabpane-left'));
      break;
    case goog.ui.TabPane.TabLocation.RIGHT:
      element.insertBefore(this.elButtonBar_, this.elContent_);
      goog.dom.classlist.add(element, goog.getCssName('goog-tabpane-right'));
      break;
    default:
      throw new Error('Invalid tab location');
  }

  // Listen for click and keydown events on header
  this.elButtonBar_.tabIndex = 0;
  goog.events.listen(
      this.elButtonBar_, this.useMouseDown_ ? goog.events.EventType.MOUSEDOWN :
                                              goog.events.EventType.CLICK,
      this.onHeaderClick_, false, this);
  goog.events.listen(
      this.elButtonBar_, goog.events.EventType.KEYDOWN, this.onHeaderKeyDown_,
      false, this);

  this.createPages_(nodes);
};


/**
 * Creates the HTML node for the clearing div, and associated style in
 * the <HEAD>.
 *
 * @return {!Element} Reference to a DOM div node.
 * @private
 */
goog.ui.TabPane.prototype.createClear_ = function() {
  'use strict';
  var clearFloatStyle = goog.html.SafeStyleSheet.createRule(
      '.' + goog.getCssName('goog-tabpane-clear'),
      {'clear': 'both', 'height': '0', 'overflow': 'hidden'});
  goog.style.installSafeStyleSheet(clearFloatStyle);
  return this.dom_.createDom(
      goog.dom.TagName.DIV, goog.getCssName('goog-tabpane-clear'));
};


/** @override */
goog.ui.TabPane.prototype.disposeInternal = function() {
  'use strict';
  goog.ui.TabPane.superClass_.disposeInternal.call(this);
  goog.events.unlisten(
      this.elButtonBar_, this.useMouseDown_ ? goog.events.EventType.MOUSEDOWN :
                                              goog.events.EventType.CLICK,
      this.onHeaderClick_, false, this);
  goog.events.unlisten(
      this.elButtonBar_, goog.events.EventType.KEYDOWN, this.onHeaderKeyDown_,
      false, this);
  delete this.el_;
  this.elButtonBar_ = null;
  this.elContent_ = null;
};


/**
 * @return {!Array<Element>} The element child nodes of tab pane container.
 * @private
 */
goog.ui.TabPane.prototype.getChildNodes_ = function() {
  'use strict';
  var nodes = [];

  var child = goog.dom.getFirstElementChild(this.el_);
  while (child) {
    nodes.push(child);
    child = goog.dom.getNextElementSibling(child);
  }

  return nodes;
};


/**
 * Creates pages out of a collection of elements.
 *
 * @param {Array<Element>} nodes Array of elements to create pages out of.
 * @private
 */
goog.ui.TabPane.prototype.createPages_ = function(nodes) {
  'use strict';
  for (var node, i = 0; node = nodes[i]; i++) {
    this.addPage(new goog.ui.TabPane.TabPage(node));
  }
};


/**
 * Adds a page to the tab pane.
 *
 * @param {goog.ui.TabPane.TabPage} page Tab page to add.
 * @param {number=} opt_index Zero based index to insert tab at. Inserted at the
 *                           end if not specified.
 */
goog.ui.TabPane.prototype.addPage = function(page, opt_index) {
  'use strict';
  // If page is already in another tab pane it's removed from that one before it
  // can be added to this one.
  if (page.parent_ && page.parent_ != this &&
      page.parent_ instanceof goog.ui.TabPane) {
    page.parent_.removePage(page);
  }

  // Insert page at specified position
  var index = this.pages_.length;
  if (opt_index !== undefined && opt_index != index) {
    index = opt_index;
    this.pages_.splice(index, 0, page);
    this.elButtonBar_.insertBefore(
        /** @type {!Node} */ (page.elTitle_),
        this.elButtonBar_.childNodes[index]);
  }

  // Append page to end
  else {
    this.pages_.push(page);
    this.elButtonBar_.appendChild(/** @type {!Node} */ (page.elTitle_));
  }

  page.setParent_(this, index);

  // Select first page and fire change event
  if (!this.selected_) {
    this.selected_ = page;
    this.dispatchEvent(new goog.ui.TabPaneEvent(
        goog.ui.TabPane.Events.CHANGE, this, this.selected_));
  }

  // Move page content to the tab pane and update visibility.
  this.elContent_.appendChild(/** @type {!Node} */ (page.elContent_));
  page.setVisible_(page == this.selected_);

  // Update index for following pages
  for (var pg, i = index + 1; pg = this.pages_[i]; i++) {
    pg.index_ = i;
  }
};


/**
 * Removes the specified page from the tab pane.
 *
 * @param {goog.ui.TabPane.TabPage|number} page Reference to tab page or zero
 *     based index.
 */
goog.ui.TabPane.prototype.removePage = function(page) {
  'use strict';
  if (typeof page === 'number') {
    page = this.pages_[page];
  }
  this.pages_.splice(page.index_, 1);
  page.setParent_(null);

  goog.dom.removeNode(page.elTitle_);
  goog.dom.removeNode(page.elContent_);

  for (var pg, i = 0; pg = this.pages_[i]; i++) {
    pg.setParent_(this, i);
  }
};


/**
 * Gets the tab page by zero based index.
 *
 * @param {number} index Index of page to return.
 * @return {goog.ui.TabPane.TabPage?} page The tab page.
 */
goog.ui.TabPane.prototype.getPage = function(index) {
  'use strict';
  return this.pages_[index];
};


/**
 * Sets the selected tab page by object reference.
 *
 * @param {goog.ui.TabPane.TabPage} page Tab page to select.
 */
goog.ui.TabPane.prototype.setSelectedPage = function(page) {
  'use strict';
  if (page.isEnabled() && (!this.selected_ || page != this.selected_)) {
    this.selected_.setVisible_(false);
    page.setVisible_(true);
    this.selected_ = page;

    // Fire changed event
    this.dispatchEvent(
        new goog.ui.TabPaneEvent(
            goog.ui.TabPane.Events.CHANGE, this, this.selected_));
  }
};


/**
 * Sets the selected tab page by zero based index.
 *
 * @param {number} index Index of page to select.
 */
goog.ui.TabPane.prototype.setSelectedIndex = function(index) {
  'use strict';
  if (index >= 0 && index < this.pages_.length) {
    this.setSelectedPage(this.pages_[index]);
  }
};


/**
 * @return {number} The index for the selected tab page or -1 if no page is
 *     selected.
 */
goog.ui.TabPane.prototype.getSelectedIndex = function() {
  'use strict';
  return this.selected_ ? /** @type {number} */ (this.selected_.index_) : -1;
};


/**
 * @return {goog.ui.TabPane.TabPage?} The selected tab page.
 */
goog.ui.TabPane.prototype.getSelectedPage = function() {
  'use strict';
  return this.selected_ || null;
};


/**
 * @return {Element} The element that contains the tab pages.
 */
goog.ui.TabPane.prototype.getContentElement = function() {
  'use strict';
  return this.elContent_ || null;
};


/**
 * @return {Element} The main element for the tabpane.
 */
goog.ui.TabPane.prototype.getElement = function() {
  'use strict';
  return this.el_ || null;
};


/**
 * Click event handler for header element, handles clicks on tabs.
 * @param {goog.events.BrowserEvent} event Click event.
 * @private
 * @suppress {strictMissingProperties} Part of the go/strict_warnings_migration
 */
goog.ui.TabPane.prototype.onHeaderClick_ = function(event) {
  'use strict';
  var el = event.target;

  // Determine index if a tab (li element) was clicked.
  while (el != this.elButtonBar_) {
    if (el.tagName == goog.dom.TagName.LI) {
      var i;
      // {} prevents compiler warning
      for (i = 0; el = el.previousSibling; i++) {
      }
      this.setSelectedIndex(i);
      break;
    }
    el = el.parentNode;
  }
  event.preventDefault();
};


/**
 * KeyDown event handler for header element. Arrow keys moves between pages.
 * Home and end selects the first/last page.
 * @param {goog.events.BrowserEvent} event KeyDown event.
 * @private
 * @suppress {strictPrimitiveOperators} Part of the go/strict_warnings_migration
 */
goog.ui.TabPane.prototype.onHeaderKeyDown_ = function(event) {
  'use strict';
  if (event.altKey || event.metaKey || event.ctrlKey) {
    return;
  }

  switch (event.keyCode) {
    case goog.events.KeyCodes.LEFT:
      var index = this.selected_.getIndex() - 1;
      this.setSelectedIndex(index < 0 ? this.pages_.length - 1 : index);
      break;
    case goog.events.KeyCodes.RIGHT:
      var index = this.selected_.getIndex() + 1;
      this.setSelectedIndex(index >= this.pages_.length ? 0 : index);
      break;
    case goog.events.KeyCodes.HOME:
      this.setSelectedIndex(0);
      break;
    case goog.events.KeyCodes.END:
      this.setSelectedIndex(this.pages_.length - 1);
      break;
  }
};



/**
 * Object representing an individual tab pane.
 *
 * @param {Element=} opt_el Container element to create the pane out of.
 * @param {(Element|string)=} opt_title Pane title or element to use as the
 *     title. If not specified the first element in the container is used as
 *     the title.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper
 * The first parameter can be omitted.
 * @constructor
 */
goog.ui.TabPane.TabPage = function(opt_el, opt_title, opt_domHelper) {
  'use strict';
  /** @type {!Element|string|null} */
  var title = null;
  var el;
  if (opt_title) {
    title = opt_title;
    el = opt_el;
  } else if (opt_el) {
    var child = goog.dom.getFirstElementChild(opt_el);
    if (child) {
      title = goog.dom.getTextContent(child);
      child.parentNode.removeChild(child);
    }
    el = opt_el;
  }

  /**
   * DomHelper used to interact with the document, allowing components to be
   * created in a different window.  This property is considered protected;
   * subclasses of Component may refer to it directly.
   * @type {goog.dom.DomHelper}
   * @protected
   * @suppress {underscore|visibility}
   */
  this.dom_ = opt_domHelper || goog.dom.getDomHelper();

  /**
   * Content element
   * @type {Element}
   * @private
   */
  this.elContent_ = el || this.dom_.createDom(goog.dom.TagName.DIV);

  /**
   * Title element
   * @type {Element}
   * @private
   */
  this.elTitle_ = this.dom_.createDom(goog.dom.TagName.LI, null, title);

  /**
   * Parent TabPane reference.
   * @type {goog.ui.TabPane?}
   * @private
   */
  this.parent_ = null;

  /**
   * Index for page in tab pane.
   * @type {?number}
   * @private
   */
  this.index_ = null;

  /**
   * Flags if this page is enabled and can be selected.
   * @type {boolean}
   * @private
   */
  this.enabled_ = true;
};


/**
 * @return {string} The title for tab page.
 */
goog.ui.TabPane.TabPage.prototype.getTitle = function() {
  'use strict';
  return goog.dom.getTextContent(this.elTitle_);
};


/**
 * Sets title for tab page.
 *
 * @param {string} title Title for tab page.
 */
goog.ui.TabPane.TabPage.prototype.setTitle = function(title) {
  'use strict';
  goog.dom.setTextContent(this.elTitle_, title);
};


/**
 * @return {Element} The title element.
 */
goog.ui.TabPane.TabPage.prototype.getTitleElement = function() {
  'use strict';
  return this.elTitle_;
};


/**
 * @return {Element} The content element.
 */
goog.ui.TabPane.TabPage.prototype.getContentElement = function() {
  'use strict';
  return this.elContent_;
};


/**
 * @return {?number} The index of page in tab pane.
 */
goog.ui.TabPane.TabPage.prototype.getIndex = function() {
  'use strict';
  return this.index_;
};


/**
 * @return {goog.ui.TabPane?} The parent tab pane for page.
 */
goog.ui.TabPane.TabPage.prototype.getParent = function() {
  'use strict';
  return this.parent_;
};


/**
 * Selects page in the associated tab pane.
 */
goog.ui.TabPane.TabPage.prototype.select = function() {
  'use strict';
  if (this.parent_) {
    this.parent_.setSelectedPage(this);
  }
};


/**
 * Sets the enabled state.
 *
 * @param {boolean} enabled Enabled state.
 */
goog.ui.TabPane.TabPage.prototype.setEnabled = function(enabled) {
  'use strict';
  this.enabled_ = enabled;
  this.elTitle_.className = enabled ?
      goog.getCssName('goog-tabpane-tab') :
      goog.getCssName('goog-tabpane-tab-disabled');
};


/**
 * Returns if the page is enabled.
 * @return {boolean} Whether the page is enabled or not.
 */
goog.ui.TabPane.TabPage.prototype.isEnabled = function() {
  'use strict';
  return this.enabled_;
};


/**
 * Sets visible state for page content and updates style of tab.
 *
 * @param {boolean} visible Visible state.
 * @private
 */
goog.ui.TabPane.TabPage.prototype.setVisible_ = function(visible) {
  'use strict';
  if (this.isEnabled()) {
    this.elContent_.style.display = visible ? '' : 'none';
    this.elTitle_.className = visible ?
        goog.getCssName('goog-tabpane-tab-selected') :
        goog.getCssName('goog-tabpane-tab');
  }
};


/**
 * Sets parent tab pane for tab page.
 *
 * @param {goog.ui.TabPane?} tabPane Tab strip object.
 * @param {number=} opt_index Index of page in pane.
 * @private
 */
goog.ui.TabPane.TabPage.prototype.setParent_ = function(tabPane, opt_index) {
  'use strict';
  this.parent_ = tabPane;
  this.index_ = (opt_index !== undefined) ? opt_index : null;
};



/**
 * Object representing a tab pane page changed event.
 *
 * @param {string} type Event type.
 * @param {goog.ui.TabPane} target Tab widget initiating event.
 * @param {goog.ui.TabPane.TabPage} page Selected page in tab pane.
 * @extends {goog.events.Event}
 * @constructor
 * @final
 */
goog.ui.TabPaneEvent = function(type, target, page) {
  'use strict';
  goog.events.Event.call(this, type, target);

  /**
   * The selected page.
   * @type {goog.ui.TabPane.TabPage}
   */
  this.page = page;
};
goog.inherits(goog.ui.TabPaneEvent, goog.events.Event);
