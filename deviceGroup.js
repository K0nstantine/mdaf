var shortId = require ('shortid')
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var DeviceGroup = function(name, desc, id){
	if (!id){
		var id = shortId.generate();
	}
	this.name = name;
	this.desc = desc;
	this.id = id;
	this.devices = [];
	this.size = 0;
};

util.inherits(DeviceGroup, EventEmitter);

DeviceGroup.prototype.addDevice = function(device){
	this.devices.push(device);
	this.size ++;
	this.emit('new', device);
}

DeviceGroup.prototype.removeDevice = function(device){
	if (typeof device === 'object'){
		device = device.id
	}
	for (i = 0; i < this.devices.length; i++){
		if (this.devices[i].id === device){
			this.devices[i] = null;
			this.devices.slice(i, 1);
			this.size --;
		}
	}
};

module.exports = DeviceGroup;