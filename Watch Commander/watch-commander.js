/*
Watch Commander v0.82
Copyright K Cartlidge, 2014.

Licensed under a Creative Commons Attribution Share-Alike (CC BY-SA) licence.
You can view this license at:
		http://creativecommons.org/licenses/by-sa/4.0/


Summary from the Creative Commons Site (not a substitute for the licence):

This license lets others remix, tweak, and build upon your work even for commercial purposes, as long as they credit you and license their new creations under the identical terms. This license is often compared to “copyleft” free and open source software licenses. All new works based on yours will carry the same license, so any derivatives will also allow commercial use. This is the license used by Wikipedia, and is recommended for materials that would benefit from incorporating content from Wikipedia and similarly licensed projects.
*/


// The main WatchCommander object processes bindings and other stuff which does
// not need duplicating across bound objects. This is necessary because the objects
// do not need to conform to a known prototype and we don't want to add the shared
// stuff to the prototype of every object that gets watched.
var WatchCommander = function() { };

// Main method, called to attach an object to the UI.
// Note that you must use '.call' to set the context to the object.
// Example:	WatchCommander.call(account, '#bound-form');
WatchCommander = function(selector) {
	var self = this;

	// Collect the keys before modifying anything.
	// Splits into normal and virtual properties.
	var props = [];
	var funcs = [];
	for(key in self) {
		if (self.hasOwnProperty(key)) {
			if (typeof(self[key]) == 'function') {
				funcs.push(key);
			} else {
				props.push(key);
			}
		}
	}

	// Store the basics required by WatchCommander into the original object.
	// By carrying this info within the object, there are no issues with cacheing,
	// lifetimes, orphans and related possibilities.
	// Note also the 'attribute' which determines the HTML element attribute checked for.
	self.__WatchCommander = {
		selector: selector,
		properties: props,
		virtuals: funcs,
		bindings: [],
		invalids: [],
		attribute: 'wc'
	};

	// Add a method to the original object to remove all the extra stuff which was
	// added to the object. Also stops all UI bindings.
	self.stopWatching = function () {

		// Remove bound control triggers.
		var qty = self.__WatchCommander.bindingCount;
		for (var i = 0; i < qty; i++) {
			var binding = self.__WatchCommander.bindings[i];
			var bound = $(binding.selector);
			bound.off('change');
		}

		// Remove added stuff from the object, returning it to normal.
		delete self.__WatchCommander;
		delete self.set;
		delete self.get;
		delete self.getOptionText;
		delete self.trigger;
		delete self.isValid;
		delete self.stopWatching;
	};

	// Add the set accessor. Returns the new value (or null if not a valid property).
	// If a value change occurs, all bindings are also re-applied.
	self.set = function(propertyName, newValue) {
		var self = this;

		// Check it's not virtual, update it, then also update any bound controls and
		// finally return the new value (in case subsequent change events have affected it).
		if (self.__WatchCommander.properties.indexOf(propertyName) > -1) {
			var oldValue = self.get(propertyName);
			self[propertyName] = newValue;
			actualNewValue = self.get(propertyName);
			if (actualNewValue != oldValue) {
				WatchCommander.applyBindings.call(self, propertyName);
			};

			// If there is an object onChange function, action it.
			if (typeof(self.onChange) != 'undefined') {
				self.onChange.apply(self, [propertyName, oldValue, actualNewValue]);
			}
			return actualNewValue;
		}

		// Return null if there is no concrete property to set.
		return null;
	};

	// Add the get accessor (either concrete or virtual properties).
	// Returns null if there is nothing available to get.
	self.get = function (propertyName) {
		var self = this;
		var value = null;
		if (self.__WatchCommander.properties.indexOf(propertyName) > -1) {
			value = self[propertyName];
		} else if (self.__WatchCommander.virtuals.indexOf(propertyName) > -1) {
			value = self[propertyName]();
		} else if (typeof(self[propertyName]) == 'function') {
			value = self[propertyName]();
		}
		return value;
	};

	// Add a default UI validity handler to the object if one is not already defined.
	// If the object already has one set, this leaves it in place to make use of it.
	// The default one toggle an 'invalid' CSS class on the bound element.
	if (typeof (self.showValidity) != 'function') {
		self.showValidity = function (propertyName, selector, valid) {
			if (valid) {
				$(selector).removeClass('invalid');
			} else {
				$(selector).addClass('invalid');
			}
		};
	};

	// Adds a method to check the validity of the concrete/virtual property named.
	// If no property is provided, the default method checks all of them and returns
	// a single flag where if ANY fail then ALL have failed.
	// This makes use of an internal collection for invalid property names on the object.
	if (typeof (self.isValid) != 'function') {
		self.isValid = function (propertyName) {
			if (typeof (self.__WatchCommander.invalids) != 'undefined') {
				if (typeof (propertyName) == 'undefined' || propertyName == null || propertyName == '') {
					return self.__WatchCommander.invalids.length == 0;
				} else {
					return self.__WatchCommander.invalids.indexOf(propertyName) == -1;
				}
			}
			return true;
		};
	};

	// Add a helper for select list option values, where the first parameter is
	// the property holding the value and the second is the property holding the
	// enumeration of possible text/value objects.
	// This helper is case and whitespace sensitive.
	self.getOptionText = function(value, optionsBinding) {
		var self = this;
		var select = '';
		var selects = self[optionsBinding]();
		var selectCount = selects.length;
		for (var i=0; i<selectCount; i++) {
			if (selects[i].value == value) {
				select = selects[i].text;
			}
		}
		return select;
	};

	// Add a method to update all bound UI controls, regardless of change state.
	self.redraw = function() {
		WatchCommander.applyBindings.call(self, true);
	};

	// Find and record the bound controls, based on the __WatchCommander.attribute setting.
	var $bound = $(selector).find('[' + self.__WatchCommander.attribute + ']');
	$bound.each(function() {
		var $this = $(this);

		// Add a random ID if there isn't one already.
		// If provided, they should be unique within the bound area.
		var id = '#' + $this[0].id;
		if (id.length == 1) {
			id = WatchCommander.makeId();
			$this[0].id = id;
			id = '#' + id;
		}

		// Skip if no ID exists or could be created (precautionary; should not occur).
		if (id.length != 1) {
			var options = $this.attr(self.__WatchCommander.attribute).split(',');
			var count = options.length;

			// Attach the bindings specified in the element's attribute.
			for(var i=0;i<count;i++) {
				var option = options[i];
				var bits = option.split(':');
				var binding = {
					selector: id,
					propertyName: bits[1],
					accessor: bits[0]
				};
				self.__WatchCommander.bindings.push(binding);
				self.__WatchCommander.bindingCount = self.__WatchCommander.bindings.length;
			};

			// Attach change handlers to the element.
			$(id).off('change').on('change', function(e) {
				var oldValue = self.get(binding.propertyName);
				var newValue = $(e.target).val();
				if (oldValue != newValue) {
					self.set(binding.propertyName, newValue);
				};
			});
		}
	});

	// Update bound controls with the object's initial values.
	WatchCommander.applyBindings.call(self);
};

// Generates a random 24-character ID (for unnamed bound controls).
WatchCommander.makeId = function() {
	return 'wc_' + ('xxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, function(char) {
		return (Math.random()*16|0).toString(16);
	}).toLowerCase());
};

// Called when a value has definitively changed; the context will be the object.
// If propertyName is omitted, all known bindings are applied.
// In any case, all virtual (function) bindings are also actioned (to allow for dependencies).
// The UI usually only updates if the current UI value differs from the property's value.
// If 'evenUnchanged' is true, then bindings will be updated regardless of this check,
// which is ideal for occasions where you need to show a definitive UI state.
WatchCommander.applyBindings = function(propertyName, evenUnchanged) {
	var self = this;
	var doAll = evenUnchanged || (typeof(propertyName) == 'undefined' || propertyName == null || propertyName == '');
	var qty = self.__WatchCommander.bindingCount;
	for(var i=0; i<qty; i++) {
		var binding = self.__WatchCommander.bindings[i];
		var isVirtual = self.__WatchCommander.virtuals.indexOf(binding.propertyName) > -1;
		if (doAll || (binding.propertyName == propertyName) || isVirtual) {
			WatchCommander.bind.call(self, binding, evenUnchanged)
		}
	}
}

// Process a specified single binding on behalf of 'applyBindings'. This exists
// independently of 'applyBindings' to allow targetted usage.
// See the 'applyBindings' description for the 'evenUnchanged' parameter details.
WatchCommander.bind = function(binding, evenUnchanged) {
	var self = this;
	var $el = $(binding.selector);
	var value;

	// Handles each type of binding.
	// This will be expanded in a future version to support custom bindings.
	switch(binding.accessor) {
		case 'val':
		case 'text':
		case 'html':
			// These synonyms pass through to the JQuery/Zepto equivalent.
			// The parameter is the property to set into the bound element.
			value = self.get(binding.propertyName);
			var current = $el[binding.accessor]();
			if ((current !== value) || evenUnchanged) {
				$el[binding.accessor](value);
			}
			break;
		case 'toggle':
		case 'addClass':
		case 'removeClass' :
			// These synonyms pass through to the JQuery/Zepto equivalent.
			// The parameter is the CSS class to action against the bound element.
			value = self.get(binding.propertyName);
			$el[binding.accessor](value);
			break;
		case 'class' :
			// The parameter is the CSS class to action against the bound element.
			// In this case, the CSS class becomes the ONLY class on the element.
			value = self.get(binding.propertyName);
			$el.removeClass();
			$el.addClass(value);
			break;
		case 'options':
			// The parameter is the property containing the text/value object array
			// which is used to populate this element's select list options.
			// If the current bound value exists as an option it will be pre-selected.
			// If it does NOT exist, the bound value should be treated as indeterminate
			// but will usually be either the element default, empty, or first option.
			var lastValue = $el.val();
			var options = self.get(binding.propertyName);
			if (options == null) {
				options = [];
			}
			var optionCount = options.length;
			$el.find('option').remove();
			var newOptions = '';
			for(var ii=0; ii<optionCount; ii++) {
				var option = "<option value='" + options[ii].value + "'>" + options[ii].text + "</option>";
				newOptions += option;
			}
			$el.append(newOptions);
			self.set(binding.propertyName, lastValue);
			value = self.get(binding.propertyName);
			break;
		default:
			// Ignore unknown bindings to gracefully handle newer declarative bindings
			// than this version of Watch Commander is written for.
			break;
	}

	// Determine the validity by removing any current entry then re-assessing it.
	// Start by assuming all is okay and removing it from the invalids collection.
	var valid = true;
	var idx = self.__WatchCommander.invalids.indexOf(binding.propertyName);
	if (idx > -1) {
			self.__WatchCommander.invalids.splice(idx, 1);
	}

	// First check if it is a required field and is missing a value.
	if (self.RequiredFields.indexOf(binding.propertyName) > -1) {
		if (typeof (value) == 'undefined' || value == null || value.toString().trim() == '') {
			valid = false;
		}
	}

	// Then check against any extra validation specified in the model.
	var hasValidation = typeof (self.Validation) != 'undefined';
	if (hasValidation) {
		if (typeof(self.Validation[binding.propertyName]) != 'undefined') {
			if (typeof (value) == 'undefined' || value == null) {
				// An undefined value will always fail custom validation.
				valid = false;
			} else {
				// Otherwise, call the custom validator.
				if (!(self.Validation[binding.propertyName].call(self, value))) {
					valid = false;
				}
			}
		}
	}

	// Store the validity result and update the UI binding(s) for the property.
	if (!valid) {
		self.__WatchCommander.invalids.push(binding.propertyName);
	}
	self.showValidity(binding.propertyName, binding.selector, valid);
}
