/**
 * @license
 * Copyright The Closure Library Authors.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Default renderer for {@link goog.ui.Checkbox}s.
 * @suppress {missingRequire} goog.ui.Checkbox.State
 */

goog.provide('goog.ui.CheckboxRenderer');

goog.forwardDeclare('goog.ui.Checkbox.State');  // TODO(user): remove this
goog.require('goog.a11y.aria');
goog.require('goog.a11y.aria.Role');
goog.require('goog.a11y.aria.State');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classlist');
goog.require('goog.object');
goog.require('goog.ui.ControlRenderer');



/**
 * Default renderer for {@link goog.ui.Checkbox}s.  Extends the superclass
 * to support checkbox states:
 * @constructor
 * @extends {goog.ui.ControlRenderer}
 */
goog.ui.CheckboxRenderer = function() {
  'use strict';
  goog.ui.CheckboxRenderer.base(this, 'constructor');
};
goog.inherits(goog.ui.CheckboxRenderer, goog.ui.ControlRenderer);
goog.addSingletonGetter(goog.ui.CheckboxRenderer);


/**
 * Default CSS class to be applied to the root element of components rendered
 * by this renderer.
 * @type {string}
 */
goog.ui.CheckboxRenderer.CSS_CLASS = goog.getCssName('goog-checkbox');


/** @override */
goog.ui.CheckboxRenderer.prototype.createDom = function(checkbox) {
  'use strict';
  var element = checkbox.getDomHelper().createDom(
      goog.dom.TagName.SPAN, this.getClassNames(checkbox).join(' '));

  /** @suppress {strictMissingProperties} Added to tighten compiler checks */
  var state = checkbox.getChecked();
  this.setCheckboxState(element, state);

  return element;
};


/**
 * @override
 * @suppress {strictMissingProperties} Added to tighten compiler checks
 */
goog.ui.CheckboxRenderer.prototype.decorate = function(checkbox, element) {
  'use strict';
  // The superclass implementation takes care of common attributes; we only
  // need to set the checkbox state.
  element = goog.ui.CheckboxRenderer.base(this, 'decorate', checkbox, element);
  goog.asserts.assert(element);
  var classes = goog.dom.classlist.get(element);
  // Update the checked state of the element based on its css classNames
  // with the following order: undetermined -> checked -> unchecked.
  var checked =
      /** @suppress {missingRequire} */ (goog.ui.Checkbox.State.UNCHECKED);
  if (goog.array.contains(
          classes, this.getClassForCheckboxState(
                       /** @suppress {missingRequire} */
                       goog.ui.Checkbox.State.UNDETERMINED))) {
    checked =
        (/** @suppress {missingRequire} */
         goog.ui.Checkbox.State.UNDETERMINED);
  } else if (
      goog.array.contains(
          classes, this.getClassForCheckboxState(
                       /** @suppress {missingRequire} */ goog.ui.Checkbox.State
                           .CHECKED))) {
    checked = /** @suppress {missingRequire} */ goog.ui.Checkbox.State.CHECKED;
  } else if (goog.array.contains(classes,
      this.getClassForCheckboxState(/** @suppress {missingRequire} */
          goog.ui.Checkbox.State.UNCHECKED))) {
    checked =
        (/** @suppress {missingRequire} */
         goog.ui.Checkbox.State.UNCHECKED);
  }
  checkbox.setCheckedInternal(checked);
  goog.asserts.assert(element, 'The element cannot be null.');
  goog.a11y.aria.setState(
      element, goog.a11y.aria.State.CHECKED,
      this.ariaStateFromCheckState_(checked));

  return element;
};


/**
 * Returns the ARIA role to be applied to checkboxes.
 * @return {goog.a11y.aria.Role} ARIA role.
 * @override
 */
goog.ui.CheckboxRenderer.prototype.getAriaRole = function() {
  'use strict';
  return goog.a11y.aria.Role.CHECKBOX;
};


/**
 * Updates the appearance of the control in response to a checkbox state
 * change.
 * @param {Element} element Checkbox element.
 * @param {goog.ui.Checkbox.State} state Updated checkbox state.
 */
goog.ui.CheckboxRenderer.prototype.setCheckboxState = function(element, state) {
  'use strict';
  if (element) {
    goog.asserts.assert(element);
    var classToAdd = this.getClassForCheckboxState(state);
    goog.asserts.assert(classToAdd);
    goog.asserts.assert(element);
    if (goog.dom.classlist.contains(element, classToAdd)) {
      return;
    }
    goog.object.forEach(
        /** @suppress {missingRequire} */ goog.ui.Checkbox.State,
        function(state) {
          'use strict';
          var className = this.getClassForCheckboxState(state);
          goog.asserts.assert(element);
          goog.dom.classlist.enable(
              element, className, className == classToAdd);
        },
        this);
    goog.a11y.aria.setState(
        element, goog.a11y.aria.State.CHECKED,
        this.ariaStateFromCheckState_(state));
  }
};


/**
 * Gets the checkbox's ARIA (accessibility) state from its checked state.
 * @param {goog.ui.Checkbox.State} state Checkbox state.
 * @return {string} The value of goog.a11y.aria.state.CHECKED. Either 'true',
 *     'false', or 'mixed'.
 * @private
 */
goog.ui.CheckboxRenderer.prototype.ariaStateFromCheckState_ = function(state) {
  'use strict';
  if (state ==
      /** @suppress {missingRequire} */ goog.ui.Checkbox.State.UNDETERMINED) {
    return 'mixed';
  } else if (
      state ==
      /** @suppress {missingRequire} */ goog.ui.Checkbox.State.CHECKED) {
    return 'true';
  } else {
    return 'false';
  }
};


/** @override */
goog.ui.CheckboxRenderer.prototype.getCssClass = function() {
  'use strict';
  return goog.ui.CheckboxRenderer.CSS_CLASS;
};


/**
 * Takes a single {@link goog.ui.Checkbox.State}, and returns the
 * corresponding CSS class name.
 * @param {goog.ui.Checkbox.State} state Checkbox state.
 * @return {string} CSS class representing the given state.
 * @protected
 * @suppress {missingRequire} goog.ui.Checkbox
 */
goog.ui.CheckboxRenderer.prototype.getClassForCheckboxState = function(state) {
  'use strict';
  var baseClass = this.getStructuralCssClass();
  if (state == goog.ui.Checkbox.State.CHECKED) {
    return goog.getCssName(baseClass, 'checked');
  } else if (state == goog.ui.Checkbox.State.UNCHECKED) {
    return goog.getCssName(baseClass, 'unchecked');
  } else if (state == goog.ui.Checkbox.State.UNDETERMINED) {
    return goog.getCssName(baseClass, 'undetermined');
  }
  throw new Error('Invalid checkbox state: ' + state);
};
