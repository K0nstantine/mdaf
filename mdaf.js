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

MDAF.prototype.start = function(server, options, authentication, users, synchronization){
	this.sessionManager = require('./sessionManager');
	this.deviceManager = new (require('./deviceManager'));
	this.sessionManager.start(server, options, authentication, users, synchronization);
};

MDAF.prototype.addToGroup = function (device, desc, name){
	return this.deviceManager.addToGroup(desc, device, name);
};

MDAF.prototype.getDevices = function (){
	return this.deviceManager.getDevices();
};

MDAF.prototype.getDeviceGroups = function(){
	return this.deviceManager.getDeviceGroups();
};

MDAF.prototype.getDeviceGroup = function(desc){
	return this.deviceManager.getDeviceGroup(desc);
};

MDAF.prototype.createMultiDeviceSession = function(devices){
	return this.sessionManager.createMultiDeviceSession(devices);
};

MDAF.prototype.getMultiDeviceSessions = function(){
	return this.sessionManager.getMultiDeviceSessionsList();
}

MDAF.prototype.setEnterpriseDevicePolicy = function(input){
	this.deviceManager.setEnterpriseDevicePolicy(input);
}

module.exports = new MDAF();