var shortId = require ('shortid')

var DeviceGroup = function(name, desc, id){
	if (!id){
		var id = shortId.generate();
	}
	this.name = name;
	this.desc = desc;
	this.id = id;
	this.devices = [];
};

DeviceGroup.prototype.addDevice = function(device){
	this.devices.push(device);
}

module.exports = DeviceGroup;