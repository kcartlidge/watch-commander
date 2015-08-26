# What is Watch Commander?

A simple JavaScript library allowing you to bind standard objects (models) to your HTML using declarative markup. Similar in concept to Angular or BackBone.
Fast, small and efficient, it provides:

* Two-way updates between your model and UI.
* Virtual properties via model functions.
* Required fields plus custom validation.
* Automatic CSS changes according to model properties.
* Auto-populated select list support.
* Easy access to model/property validity state.
* Compact, commented source that is easy to understand.

# Status

Working. It was, however, created as a personal experiment. Whilst it is absolutely fine for use in other projects (I do so myself) it should be considered a working proof of concept not a maintained library.

# Setup and Usage

## Installation and Requirements

Open the *test.html* page to see it in action.
The only external dependency is <a href="http://zeptojs.com/" target="_new">Zepto.js</a>, a lightweight JQuery replacement with compatible syntax and functionality for core basics.

If you already have JQuery in your project then this dependency is satisfied anyway.
Using Zepto the total size is around 35kb. Using JQuery 1.8.2 (for example) will take it to over 120kb, hence the Zepto suggested alternative.

## How to Use Watch Commander

* Create your model (it's a standard JavaScript thing).
* Create instances of your model in your normal way.
* Bind your object to your UI area.

These steps are covered in detail below.

## Creating a Model

Unlike most other UI binding frameworks, there is no need for a special type of object for binding to work. Standard javascript objects are used, with both properties and functions available for UI access.

Functions are termed *virtuals*; you may be familiar with them in other frameworks under the name *computeds*. They can usually be used in exactly the same way as normal properties.

``` javascript
// Creation function for a new model.
// Note that ANY JavaScript object is fine; there is nothing extra required.
var TestAccount = function() {

	// Various test properties.
	this.Salutation = '';
	this.FirstName = '';
	this.LastName = '';
	this.Balance = 0;

	// Virtual property for the name without a salutation.
	// This can be bound exactly the same as a normal property.
	this.FullName = function() {
		return (this.FirstName + ' ' + this.LastName).trim();
	};

	// Virtual property for the name with salutation.
	// Note how it uses the 'getOptionText' function added by Watch Commander.
	this.DisplayName = function() {
		return (this.getOptionText(this.Salutation,'getSalutations') + ' ' + this.FullName()).trim();
	};

	// Virtual property for use as a UI display flag.
	this.hasFullName = function() {
		return this.FullName().length > 0;
	};

	// Virtual property can be used to highlight a balance.
	this.CSS = function() {
		return this.Balance == 0 ? '' : (this.Balance <= 0 ? 'credit' : 'overdue');
	};
};

// Returns options for a select list of salutations. This could
// look up a database or fetch from elsewhere in your code.
// It could also be a simple property with populated entries.
// This is done as a prototype function to avoid duplication
// across all instances of TestAccount.
TestAccount.prototype.getSalutations = function () {
	return [
		{value:'0', text:''},
		{value:'1', text:'Mr'},
		{value:'2', text:'Mrs'},
		{value:'3', text:'Miss'},
		{value:'4', text:'Ms'},
		{value:'5', text:'Professor'},
		{value:'6', text:'Doctor'},
		{value:'7', text:'Reverend'},
		{value:'8', text:'Count'}
	];
};

// Array of simple required fields.
TestAccount.prototype.RequiredFields = ['FirstName'];

// Per-property validation functions.
TestAccount.prototype.Validation = {
	LastName: function (value) { return value.length > 2; }
};
```

## Annotating the Markup

Watch Commander uses 'declarative' markup for it's binding. In simple terms, you add an attribute to your controls and when your model is activated those attributes are used to tie in the model functionality.

Some examples are shown below, and detailed further in the *Markup Reference* section.

The example shows the facility to toggle visibility or change CSS classes, so you can (for example) have a virtual property on your model to represent it's state plus a collection of elements which each have bindings set up so that they are only visible for certain values of that state.

The result is that when your model's state changes so does your UI (automatically) with areas/controls appearing/disappearing as required.

``` html
<div id='bound-controls'>
	<div class='form-block'>
		<h3 style='display:none' wc='html:DisplayName,toggle:hasFullName'></h3>
		<div class='form-fields'>
			<label for='salutation'>Salutation:</label>
			<select name='salutation' wc='options:getSalutations,val:Salutation' autofocus='autofocus'></select>
		</div>
		<div class='form-fields'>
			<label for='firstname'>First Name:</label>
			<input type='text' name='firstname' wc='val:FirstName'>
		</div>
		<div class='form-fields'>
			<label for='lastname'>Last Name:</label>
			<input id='lastname' type='text' name='lastname' wc='val:LastName'>
		</div>
		<div class='form-fields'>
			<label> &nbsp;</label>
			Balance: <strong wc='html:Balance,class:CSS'></strong>
		</div>
	</div>
</div>
```

You can see other things going on in the **wc** attribute used by *Watch Commander*, such as the auto-populating of *select* options (see the *Salutation*). This functionality is detailed in the next section.

## Binding the Model

With *Watch Commander* the use of standard objects makes this trivial. Once activated, the object is decorated with *set*, *get* and a couple of support functions (detailed below). Naturally there is also a method to decouple the UI which 'undecorates' the object and returns it to it's original state.

The intention is to drop the use of get/set and use the JavaScript *getter/setter* which arrived with ECMAScript 5 and was fleshed out in ECMAScript 6. This hasn't been done yet as it requires a shim for IE8 and earlier - which exists but is an extra dependency I haven't decided yet is worth requiring.

In any case, the extras should happily co-exist within your object.

``` javascript
// As we start with a standard object, you access it's properties as normal.
// The Salutation value matches one from the 'options:getSalutations' used
// in the select list in the sample HTML above which is why it is a number.
var account = new TestAccount();
account.Salutation = "8";
account.FirstName = "Bobby";
account.LastName = "Tables";

// Once WatchCommander is in play, switch to using the .get and .set methods.
$(document).on('ready', function(){
	WatchCommander.call(account, '#bound-controls');
	account.set('Balance', 0);
});
```

## Virtual Properties

Any function within a bound object is treated as a virtual property. These functions are handled as if they were normal properties and are interchangeable in functionality, with the exception of the 'set' method which rather than returning the value set will do nothing (as it has no meaning in this context) and return null.

``` javascript
// Virtual property for the name without a salutation.
// This can be bound exactly the same as a normal property.
this.FullName = function() {
	return (this.FirstName + ' ' + this.LastName).trim();
};
```

## Validation

If the bound object has a *RequiredFields* property, it is treated as a collection of property names to identify required fields. This check is always performed first.

``` javascript
// Array of simple required fields.
TestAccount.prototype.RequiredFields = ['FirstName'];
```

Note that this is attached to the object's prototype in order to avoid the 'baggage' of the required property list being carried around with every instance. This is not essential; if needed, each instance can have it's own set of required fields. If, however, you need such varying validation you would be better served using custom validators (below).

## Custom Validators

Additionally, an object may have a *Validation* child object containing one or more functions named after properties. If any property has an equivalent function then it is treated as a custom validator and should return *true* for valid and *false* for invalid.

``` javascript
// Per-property validation functions.
TestAccount.prototype.Validation = {
	LastName: function (value) { return value.length > 2; }
};
```

By default, validation is displayed using a provided *showValidity* function which toggles an *invalid* CSS class on bound controls.

A function is also made available on the object named *isValid* to track the current state of either a passed-in property name or the object as a whole if no property is specified.

``` javascript
// Do we have a last name, and is it long enough?
var okayLastName = account.isValid('LastName');
```

## Custom Bindings

Currently not supported; an implementation is on the way.

If required in the meantime, you can add bindings into the *WatchCommander.js* file within the *switch* statement in the *WatchCommander.bind* method. The *accessor* is the binding name to the left of the colon and the *propertyName* is everything to the right of that colon up to (but excluding) the next colon or comma. If you require more parameters for your binding, do not use those two characters as separators.

## Detaching

As *Watch Commander* adds to a bound object, there is a function attached to also remove Watch Commander entirely from that object.

``` javascript
account.stopWatching();
```

This unbinds from the UI and undecorates the object.

## Watching for Changes

Whilst Watch Commander handles the UI syncing itself, you can register your own code's interest in changes to any property. If you do so, then Watch Commander will call your code whenever a property's value is changed *after* the UI has been updated. It provides you the old and new values so you can audit as necessary.

To do this, attach an **onChange** function to your object (or it's prototype to catch all instances). This function will receive the name of the property just changed, it's value prior to the change and the new value just set.

The most common use of this feature is to maintain a *dirty* flag for the object so your code knows if it needs to update it in your storage layer.

``` javascript
// Catch and process any changes AFTER the UI has been updated.
TestAccount.prototype.onChange = function (propertyName, oldValue, newValue) {
	if (propertyName.toUpperCase() != 'TIMER') {
		console.log('[' + propertyName + '] has changed from ' + oldValue + ' to ' + newValue + '.');
	}
};
```

## Markup Reference

As shown previously, markup uses the extra element attribute 'wc':

``` html
<h3 style='display:none' wc='html:DisplayName,toggle:hasFullName'></h3>
```

The options available, called *bindings*, are listed below.

Note that you may have multiple entries comma separated (see example above) in which case they are processed in strict sequence. You could for example use the *class* binding to clear existing CSS classes and set a new (exclusive) one, followed by an *addClass* binding to enhance your UI by adding in extra classes as well.

  wc='text:propertyName'
Sets the text attribute of a control, such as an input or password element, from the value of the property.

	wc='val:propertyName'
Sets the value attribute of a control, such as a select list, from the value of the property.

	wc='html:propertyName'
Sets the html content of a control, such as a div, span or paragraph, from the value of the property.

	wc='options:propertyName'
Sets the options used by a select list control from the value of the property - this should be an array of text/value objects as per the *salutation* used as an example in various places above.

	wc='toggle:propertyName'
Changes the visibility of a control based on the property, whose value is treated as a JavaScript boolean.

	wc='class:propertyName'
Sets the CSS class of a control from a property value. This is exclusive; all other classes are removed.

	wc='addClass:propertyName'
	wc='removeClass:propertyName'
Adds/removes the CSS class specified by the property to/from the bound control.

---

# JavaScript Implications

## Added to Watched Objects:

	__WatchCommander
An object holding the definitions, bindings and validations.

	stopWatching()
Detach WatchCommander and return the object to it's original state.

	set(propertyName, newValue)
Set a concrete property whilst maintaining UI/binding state, returning the resulting value. If the property is virtual the function silently ignores the request and returns null.

	get(propertyName)
Get the value of a property (concrete or virtual). If not found, null is returned.

	showValidity(propertyName, selector, valid)
Update the property validity state on the UI. A default (CSS based) showValidity function is added if none already exists on the object; provide your own on the object instead and it will be used automatically.

	isValid(propertyName)
Returns true if the property is valid. If no propety is specified, overall object validity is given. This relies on the last validity assessment states, triggered by *get*, *set* etc. - any changes to the property that bypass these methods will cause inconsistency.

	getOptionText(value, optionsBinding)
A utility/helper method. Returns the text for the selected value from the text/value *optionsBinding* collection. OptionsBinding is the name of the property with the enumeration of text/value objects, as specified in the select list UI declaration.

	redraw()
Causes a refresh of all bindings, setting the UI to a known state. This should not normally be necessary but can provide the reassurance of guaranteed consistency.

## Global *WatchCommander* Object:

	applyBindings(propertyName, evenUnchanged)
Applies all known bindings. If the *propertyName* is given, only that property is assessed. If *evenUnchanged* then the UI is updated even if the dislpayed value matches the property (i.e. no obvious change to display).

	bind(binding, evenUnchanged)
Used internally. Applies a single binding on behalf of applyBindings.

	makeId()
Returns a unique ID. This is used internally to ensure that all bound UI elements have an ID for efficient access in the browser DOM and means that Watch Commander does not require you to manually add ID attributes to your markup (though it will make use of them if you do).

## Known Issues

* The *applyBindings* method also updates virtuals. However it updates bindings in sequence meaning that any virtual bindings found before a concrete binding will be set first. This means that if your virtual binding looks at the UI value it will be out of date. Alhough it should be looking at the object property value instead, which would work correctly, this should be addressed.
* In that same method the check for *doAll* looks for an empty string in the *propertyName* and also uses it as an indexer. As this is an unsanitised input it should be trimmed before usage.
