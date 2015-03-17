var shortId = require('shortid');
var mdaf = require('./mdaf')

var DeviceManager = function(){
	this.deviceList = [];
	this.deviceGroupList = [];

	this.connectionStatus = {"OFFLINE": 0, "ONLINE": 1};
	//this.deviceType = {"SMARTPHONE": 0, "TABLET": 1, "LAPTOP": 2, "BOARD": 3}

	mdaf.on('authenticated', function(sess, username){
		for (var i = 0; i < this.deviceList.length; i++){
			if (this.deviceList[i] === sess.id){
				return;
			}
		};
		var device = this.createDevice(sess.id, username);
		mdaf.emit('device', device);
	}.bind(this));

	//mdaf.on('logout', function(sess){
	//	this.removeDevice(sess.id)
	//}.bind(this))
};

// devices

DeviceManager.prototype.createDevice = function(id, name){
	var device = new (require('./device'))(id, name);
	this.deviceList.push(device);
	return device;
};

// device groups
/**
  * desc - object {key: value}, where key is the property which is 
  	common for the devices in the group. Value - is the value of its property. 
 */
DeviceManager.prototype.createDeviceGroup = function(name, desc, id){
	if (!id){
		var id = shortId.generate();
	}
	var deviceGroup = {
		'name' : name,
		'desc' : desc,
		'id' : id,
		'devices' : []
	};
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
	group.devices.push(device);
	console.log(this.deviceGroupList)
};


DeviceManager.prototype.getDeviceGroup = function(desc){
	for (var i = 0; i < this.deviceGroupList.length; i++){
		var group = this.deviceGroupList[i];
		if (JSON.stringify(group.desc) === JSON.stringify(desc)){
			return group;
		}
	}
};

module.exports = DeviceManager;