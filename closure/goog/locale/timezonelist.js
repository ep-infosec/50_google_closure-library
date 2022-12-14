/**
 * @license
 * Copyright The Closure Library Authors.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Functions for listing timezone names.
 * @suppress {deprecated} Use goog.i18n instead.
 */

goog.provide('goog.locale.timezonelist');

goog.require('goog.locale');


/**
 * Returns the displayable list of short timezone names paired with its id for
 * the current locale, selected based on the region or language provided.
 *
 * This method depends on `goog.locale.TimeZone*__<locale>` available
 * from http://go/js_locale_data. Users of this method must add a dependency on
 * this.
 *
 * @param {string=} opt_regionOrLang If region tag is provided, timezone ids
 *    specific this region are considered. If language is provided, all regions
 *    for which this language is defacto official is considered. If
 *    this parameter is not speficied, current locale is used to
 *    extract this information.
 *
 * @return {!Array<Object>} Localized and relevant list of timezone names
 *    and ids.
 */
goog.locale.timezonelist.getTimeZoneSelectedShortNames = function(
    opt_regionOrLang) {
  'use strict';
  return goog.locale.getTimeZoneNameList_(
      'TimeZoneSelectedShortNames', opt_regionOrLang);
};


/**
 * Returns the displayable list of long timezone names paired with its id for
 * the current locale, selected based on the region or language provided.
 *
 * This method depends on `goog.locale.TimeZone*__<locale>` available
 * from http://go/js_locale_data. Users of this method must add a dependency on
 * this.
 *
 * @param {string=} opt_regionOrLang If region tag is provided, timezone ids
 *    specific this region are considered. If language is provided, all regions
 *    for which this language is defacto official is considered. If
 *    this parameter is not speficied, current locale is used to
 *    extract this information.
 *
 * @return {!Array<Object>} Localized and relevant list of timezone names
 *    and ids.
 */
goog.locale.timezonelist.getTimeZoneSelectedLongNames = function(
    opt_regionOrLang) {
  'use strict';
  return goog.locale.getTimeZoneNameList_(
      'TimeZoneSelectedLongNames', opt_regionOrLang);
};


/**
 * Returns the displayable list of long timezone names paired with its id for
 * the current locale.
 *
 * This method depends on `goog.locale.TimeZoneAllLongNames__<locale>` available
 * from http://go/js_locale_data. Users of this method must add a dependency on
 * this.
 *
 * @return {Array<Object>} localized and relevant list of timezone names
 *    and ids.
 */
goog.locale.timezonelist.getTimeZoneAllLongNames = function() {
  'use strict';
  var locale = goog.locale.getLocale();
  return /** @type {Array<Object>} */ (
      goog.locale.getResource('TimeZoneAllLongNames', locale));
};


/**
 * Returns the displayable list of timezone names paired with its id for
 * the current locale, selected based on the region or language provided.
 *
 * This method depends on `goog.locale.TimeZone*__<locale>` available
 * from http://go/js_locale_data. Users of this method must add a dependency on
 * this.
 *
 * @param {string} nameType Resource name to be loaded to get the names.
 *
 * @param {string=} opt_resource If resource is region tag, timezone ids
 *    specific this region are considered. If it is language, all regions
 *    for which this language is defacto official is considered. If it is
 *    undefined, current locale is used to extract this information.
 *
 * @return {!Array<Object>} Localized and relevant list of timezone names
 *    and ids.
 * @private
 */
goog.locale.getTimeZoneNameList_ = function(nameType, opt_resource) {
  'use strict';
  var locale = goog.locale.getLocale();

  if (!opt_resource) {
    opt_resource = goog.locale.getRegionSubTag(locale);
  }
  // if there is no region subtag, use the language itself as the resource
  if (!opt_resource) {
    opt_resource = locale;
  }

  var names = goog.locale.getResource(nameType, locale);
  var ids = goog.locale.getResource('TimeZoneSelectedIds', opt_resource);
  /** @suppress {strictMissingProperties} Added to tighten compiler checks */
  var len = ids.length;
  var result = [];

  for (var i = 0; i < len; i++) {
    var id = ids[i];
    result.push({'id': id, 'name': names[id]});
  }
  return result;
};
