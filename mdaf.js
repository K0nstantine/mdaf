var util = require ('util');
var EventEmitter =  require('events').EventEmitter;
/*
		EMITTED EVENTS
 * authenticated - authentication is succeed
 */
var MDAF = function(){
	this.sessionManager = null;
	this.deviceManager = null;
};

util.inherits(MDAF, EventEmitter);

MDAF.prototype.start = function(server, options, authentication, users){
	this.sessionManager = new (require('./sessionManager'));
	this.deviceManager = new (require('./deviceManager'));
	this.sessionManager.start(server, options, authentication, users);
};

MDAF.prototype.addToGroup = function (desc, device, name){
	this.deviceManager.addToGroup(desc, device, name);
}

module.exports = new MDAF();