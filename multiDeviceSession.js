var mdaf = require('./mdaf')
var shortid = require('shortid')

var MultiDeviceSession = function(){
	this.id = null;
	this.ltsList = [];
	this.deviceList = [];
}

MultiDeviceSession.prototype.initialize = function (sessions, devices){
	this.ltsList = sessions;
	this.deviceList = devices;
	this.ltsList.forEach(function(lts){
		this.setEventListeners(lts)
	}, this);
	this.id = shortid.generate();
	return this.id;
};

MultiDeviceSession.prototype.setEventListeners = function (lts){
	lts.continuous = true;
	lts.emit('continuous');
	lts.on('sharedUpdate', function(data){
		console.log('shared update event is emitted')
		this.ltsList.forEach(function(anotherLts){
			if (lts.id !== anotherLts.id){
				this.sendSharedUpdate (anotherLts, data.message);
			};
		}, this)
	}.bind(this));

	lts.on('command', function(data){
		if (data.id){
			var receiver = this.getLongTermSession(data.id);
			receiver.send(JSON.stringify(data.message));
		} else { 
			this.ltsList.forEach(function(anotherLts){
				if (lts.id !== anotherLts.id){
					anotherLts.send (JSON.stringify(data.message));
				}
			}, this)
		}
	}.bind(this))
}

MultiDeviceSession.prototype.getLongTermSession = function(id){
	for (var i = 0; i < this.ltsList.length; i++){
		if (this.ltsList[i].id === id){
			return(this.ltsList[i]);
		}
	}
}

///   TIMEOUT should be tested!!!

MultiDeviceSession.prototype.sendSharedUpdate = function (lts, message){
	var toSend = JSON.stringify(message)
	if (lts.isConnected()){
		lts.send(toSend);
	} else {
		lts.pendingUpdates.push(toSend);
		if (message.hasOwnProperty(timeout)){
			setTimeout(function(){
				var index = lts.pendingUpdates.indexOf(toSend);
				lts.pendingUpdates.slice(index, 1);
			}, message.timeout)
		}
	};
};

MultiDeviceSession.prototype.addDevice = function (device){
	this.deviceList.push(device);
	var lts = mdaf.sessionManager.getLongTermSession(device.id);
	this.ltsList.push(lts);
	this.setEventListeners (lts);
};

MultiDeviceSession.prototype.removeDevice = function (device){
	var lts = this.getLongTermSession(device.id);
	var index = this.ltsList.indexOf(lts)
	lts.continuous = false;
	if (index === -1){
		for (var i = 0; i < this.ltsList.length; i++){
			if (this.ltsList[i].id === lts.id){
				index = i;
				this.ltsList[i].removeAllListeners('sharedUpdate');
				this.ltsList[i].removeAllListeners('command');
				break;
			};
		};
	};
	this.ltsList.slice(index, 1);
};

MultiDeviceSession.prototype.stop = function(){
	this.ltsList.forEach(function(lts){
		lts.removeAllListeners('sharedUpdate');
		lts.removeAllListeners('command');
	}, this);
}

module.exports = MultiDeviceSession;

