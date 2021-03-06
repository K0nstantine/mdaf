var shortId = require('shortid');
var mdaf = require('./mdaf')

var DeviceManager = function(){
	this.deviceList = [];
	this.deviceGroupList = [];
	this.enterprise = {};
	this.connectionStatus = {"OFFLINE": 0, "ONLINE": 1};
	//this.deviceType = {"SMARTPHONE": 0, "TABLET": 1, "LAPTOP": 2, "BOARD": 3}

	mdaf.on('authenticated', function(sess, username){
		var device = this.createDevice(sess, username);
		var message = {
			'mdaf' : 'device',
			'id' : device.id,
			'owner' : device.owner,
			'name' : device.name
		};
		sess.send (JSON.stringify(message));
		mdaf.emit('device', device);
	}.bind(this));

	//mdaf.on('logout', function(sess){
	//	this.removeDevice(sess.id)
	//}.bind(this))
};

// devices

DeviceManager.prototype.createDevice = function(sess, name){
	var existingDevice = this.getDevice(sess.id)
	if (!existingDevice){
		var device = new (require('./device'))(sess, name);
		this.deviceList.push(device);
		return device;
	} else {
		existingDevice.setSession(sess);
	}
};

// device groups
/**
  * desc - object {key: value}, where key is the property which is 
  	common for the devices in the group. Value - is the value of its property. 
 */
DeviceManager.prototype.createDeviceGroup = function(name, desc, id){
	var deviceGroup = new (require('./deviceGroup'))(name, desc, id);
	this.deviceGroupList.push(deviceGroup);
	return deviceGroup;
};

/**
  * desc - object {key: value}, where key is the property which is 
  	common for the devices in the group. Value - is the value of its property. 
 */

DeviceManager.prototype.addToGroup = function(desc, device, name){
	var group = this.getDeviceGroup(desc);
	group = group ? group : this.createDeviceGroup(name, desc);
	group.addDevice(device);
	return group;
};


DeviceManager.prototype.getDeviceGroup = function(desc){
	for (var i = 0; i < this.deviceGroupList.length; i++){
		var group = this.deviceGroupList[i];
		if (JSON.stringify(group.desc) === JSON.stringify(desc)){
			return group;
		}
	}
};

DeviceManager.prototype.getDevices = function(){
	return this.deviceList;
};

DeviceManager.prototype.getDevice = function(id){
	for (var i = 0; i < this.deviceList; i++){
		if (this.deviceList[i].id === id) return this.deviceList[i]
	}
	return null
};

DeviceManager.prototype.getDeviceGroups = function (){
	return this.deviceGroupList;
}

DeviceManager.prototype.setEnterpriseDevicePolicy = function(input){
	this.enterprise = input;
}

module.exports = DeviceManager;