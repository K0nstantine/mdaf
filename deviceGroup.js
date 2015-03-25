var shortId = require ('shortid')

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

DeviceGroup.prototype.addDevice = function(device){
	this.devices.push(device);
	this.size ++;
}

module.exports = DeviceGroup;