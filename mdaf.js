var util = require ('util');
var EventEmitter =  require('events').EventEmitter;
/*
		EMITTED EVENTS
 * authenticated - authentication is succeed - longTermSession and username
 * device - new device is added - device
 * sessionRestored - old lts is restored, continuous session would be synchronized - longTermSession

 !!!!!!!!!!! InnerUse only
 
 * Reconnected - session is restored but it is continuous. Some updates might be pending.

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
	return this.deviceManager.addToGroup(desc, device, name);
};

MDAF.prototype.createContinuousSession = function(devices){
	this.sessionManager.createContinuousSession(devices);
}

module.exports = new MDAF();