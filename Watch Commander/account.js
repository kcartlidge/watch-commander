
// Creation function for a new model. Watch Commander
// can also work with standard JavaScript objects.
var TestAccount = function() {

	// Various test properties.
	this.State = 0;
	this.Timer = 0;
	this.Balance = 0;
	this.Salutation = '';
	this.FirstName = '';
	this.LastName = '';

	// Virtual property to highlight a balance.
	this.CSS = function() {
		return this.Balance == 0 ? '' : (this.Balance <= 0 ? 'credit' : 'overdue');
	};

	// Virtual property for just the name.
	this.FullName = function() {
		return (this.FirstName + ' ' + this.LastName).trim();
	};

	// Virtual property for name with salutation.
	this.DisplayName = function() {
		return (this.getOptionText(this.Salutation,'getSalutations') + ' ' + this.FullName()).trim();
	};

	// Virtual property for use as a UI display flag.
	this.hasFullName = function() {
		return this.FullName().length > 0;
	};

	// Virtual property for UI status display.
	this.TimerText = function() {
		return 'Seconds active: ' + this.get('Timer');
	};

};



// The prototype functions/properties are shared across instances, rather
// than being duplicated every time a new instance is created.

// FireFox warns that this is slow in it's console. The reason is that by
// changing the prototype we are in effect corrupting the browser/JIT
// understanding of the object and from that point on it will use a much
// slower (more careful) way of dealing with the object. The alternative
// however is Object.create and that requires IE9+ and allowing for that
// would unnecessarily complicate this example.

// Catch and process any changes AFTER the UI has been updated.
TestAccount.prototype.onChange = function (propertyName, oldValue, newValue) {
	if (propertyName.toUpperCase() != 'TIMER') {
		console.log('[' + propertyName + '] has changed from ' + oldValue + ' to ' + newValue + '.');
	}
};

// Return a list of valid titles for the dropdown list.
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
