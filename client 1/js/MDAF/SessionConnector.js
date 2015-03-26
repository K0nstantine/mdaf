function SessionConnector(){
	this.server = null;
	this.sock = null;
	this.session = {
		'id' : null,
		'authState': 0
	};

  this.pendingSharedMessages = [];

	this.user = '';
	this.password = '';
	this.authState = {'NOT_AUTHENTICATED' : 0, 'AUTHENTICATED' : 1, 'ERROR' : 2};

	this.onConnected = null;
	this.onDisconnected = null;
	this.onNoConnection = null;
  this.onSessionRestored = null;
	this.onLoggedIn = null;
	this.onLoggedOut = null;
	this.onLoginError = null;
	this.externalMessageHandler = null;

	this.cachingFramework = new CachingFramework();
}

SessionConnector.prototype.initialize = function(server, authenticate, options) {
	this.server = server;
	if (authenticate){
		this.user = authenticate.user;
		this.password = authenticate.password;
	} else {
    this.session.authState = this.authState.AUTHENTICATED;
  }
  if (options) {
  	this.onConnected = options.onConnected;
  	this.onDisconnected = options.onDisconnected;
  	this.onNoConnection = options.onNoConnection;
    this.onSessionRestored = options.onSessionRestored;
  	this.onLoggedIn = options.onLoggedIn;
  	this.onLoggedOut = options.onLoggedOut;
  	this.onLoginError = options.onLoginError;
  	this.externalMessageHandler = options.externalMessageHandler;
  }
	this.connect();
};

SessionConnector.prototype.setOnConnectedHandler = function(handler){
	this.onConnected = handler;
};

SessionConnector.prototype.setOnDisconnectedHandler = function(handler){
	this.onDisconnected = handler;
};

SessionConnector.prototype.setOnNoConnectionHandler = function(handler){
	this.onNoConnection = handler;
};

SessionConnector.prototype.setOnSessionRestored = function(handler){
  this.onSessionRestored = handler;
};

SessionConnector.prototype.setOnLoggedInHandler = function(handler){
	this.onLoggedIn = handler;
};

SessionConnector.prototype.setOnLoggedOutHandler = function(handler){
	this.onLoggedOut = handler;
};

SessionConnector.prototype.setOnLoginErrorHandler = function(handler){
	this.onLoginError = handler;
};

SessionConnector.prototype.setExternalMessageHandler = function(handler){
	this.externalMessageHandler = handler;
};
 // Creating a socket and setting basic handlers for it.
SessionConnector.prototype.connect = function() {
  var _this = this;
  this.sock = new SockJS(this.server + '/socket', null, { heartbeatTimeout: 6100 });

  this.sock.onopen = function() {
    console.log('connection to ' + _this.server + '/socket opened', _this.sock);

    // call callback if there is any
    if (typeof _this.onConnected === 'function') {
      _this.onConnected();  
    }

  };

  this.sock.onmessage = function(msg) {
    var aMessageObject = null;
    try {
      aMessageObject = JSON.parse(msg.data);
    } catch (err) {
      console.error('Error parsing incoming JSON message ' + msg.data, err);
    }
    if (aMessageObject) {
      //console.log ('Processing Message', JSON.stringify(o));
      _this.handleMessage(aMessageObject);
    } else {
      console.log('no message handler or null message ', JSON.stringify(aMessageObject));
      //statusFeedback('Can't handle message','No message handler or null message for: '+JSON.stringify(o));
    }
  };

  this.sock.onclose = function() {

    _this.sock = null;
    console.log('connection to ' + _this.server + 'closed');
    if (typeof _this.onDisconnected === 'function') {
      _this.onDisconnected(); 
    }
    if (_this.session.authState === _this.authState.AUTHENTICATED) {
      // logged in, but lost connection
      // try to reconnect after 1000ms
      setTimeout(function() {_this.connect();}, 1000);
    } else if (_this.session.authState === _this.authState.ERROR) {
      console.log('wrong username or password');
      if (typeof _this.onLoginError === 'function') {
        _this.onLoginError();
        _this.session.authState = _this.authState.NOT_AUTHENTICATED;
      } else {
        console.error('unable to call "onLoginError" handler');
      }
    } else if (_this.session.id){
      if (typeof _this.onNoConnection === 'function') {
        _this.onNoConnection(); 
        _this.session.authState = _this.authState.NOT_AUTHENTICATED;
      } else {
        console.error('unable to call "onNoConnection" handler');
      }
    }
  };

};

SessionConnector.prototype.updateShared = function(message){
  var envelopedMessage = {};
  if (!message.hasOwnProperty('mdaf')){
    var time = (Date.now) ? Date.now() : new Date.getTime(); 
    envelopedMessage = {
      'mdaf' : 'sharedUpdate',
      'timestamp' : time,
      'message' : message
    };
  } else {
    envelopedMessage = message;
  }
  this.send(envelopedMessage, function(mes){this.pendingSharedMessages.push(mes)});
}

SessionConnector.prototype.sendDeviceMessage = function(message, id){
  var envelopedMessage = {
    'sendTo' : id,
    'message' : message
  }
  this.send(envelopedMessage);
}

  // send arbitrary object o to server if a connection exists
SessionConnector.prototype.send = function(o, onError) {
  if (this.sock){
    console.log("[SEND] " + JSON.stringify(o));
    this.sock.send(JSON.stringify(o));
  } else if (typeof onError === 'function') {
      onError(o);
  }
};

/**
 * handle messages that are relevant to the connection and authentication
 * and pass everything else on to the message parser
 */
SessionConnector.prototype.handleMessage = function(message) {
  var _this = this;
  if (message.hasOwnProperty('mdaf')){
    if (message.mdaf === 'ltsID'){

      _this.cachingFramework.get('ltsID').then(function onResolve(ltsID){
        _this.send({
          "mdaf" : 'ltsID',
          "ltsID" : ltsID})
        _this.session.id = ltsID;
      }, function onReject(){
        _this.cachingFramework.cache('ltsID', message.ltsID)
        _this.send({
          "mdaf" : 'ltsID',
          "ltsID" : message.ltsID});
        _this.session.id = message.ltsID;
      })

      //challenge authentication
    } else if (message.mdaf === 'challenge') {
      this.challengeAuthenticate(message.challenge);
      //that's all what client needs for challenge authentication

    } else if (message.mdaf === 'authenticated'){
      if (message.authenticated === 'success'){
        this.session.authState = this.authState.AUTHENTICATED;
        console.log('Authentication successfull');
        // fire event handler for successfull login
        if (this.onLoggedIn)
          this.onLoggedIn();
      } else {
        this.session.authState = this.authState.NOT_AUTHENTICATED;
        this.sock.close();
      }
    } else if (message.mdaf === 'sessionRestored') {
      if (message.sessionRestored === 'success'){
        if (typeof this.onSessionRestored === 'function')
          this.onSessionRestored();
      } else {
        this.session.authState = this.authState.ERROR;
        this.sock.close();
      }
    } else if (message.mdaf === 'synchronization'){
      if (message.synchronization === 'clientFirst') {
        this.clientFirstSynchronization()
      }
    }
  } else {
  //hand things ove to the general message parser
    this.externalMessageHandler(message);
  }
};

//message loss handling is nasty and dumm, but partially implemented:
// if the message can't be sent - it is put into the queu again
// function is recursively called, as long as all the pending messages
// are not sent.
SessionConnector.prototype.clientFirstSynchronization = function (){
  if (this.pendingSharedMessages.length > 0) {
    for (var i = this.pendingSharedMessages.length-1; i > -1; i--){
      this.sendShared(this.pendingSharedMessages[i]);
      this.pendingSharedMessages.slice(i, 1);
    };
    if (this.sock){
      this.clientFirstSynchronization()
    }
  } else {
    this.send ({
      'mdaf' : 'synchronize'
    });
  };
};

SessionConnector.prototype.challengeAuthenticate = function(challenge) {
  // we use the pwdHash as secret key, as this is slightly more secure than using the (known) challenge
  // initialize with our secret
  var pass = '' + CryptoJS.SHA256(this.password);
  var hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, pass);
  // superimpose the message
  hmac.update(challenge);
      this.send({
        'mdaf':'authenticate',
      'auth':{
        'username':this.user,
        'hmac': CryptoJS.enc.Hex.stringify(hmac.finalize()),
      //  'device': this.device.description
      }
  });
};

SessionConnector.prototype.logout = function() {
  this.send({
    'mdaf' : 'logout'
  })
  this.session.authState = this.authState.NOT_AUTHENTICATED;
  try { this.sock.close(); } 
  catch(error) { console.warn('connection already closed'); }
  this.user = '';
  this.password = '';
  if (typeof this.onLoggedOut === 'function') {
    this.onLoggedOut();
  } else {
    console.error('unable to call "ConnectionManager.onLoggedOut"');
  }
};

SessionConnector.prototype.isAuthenticated = function() {
  return (this.session.authState === this.authState.AUTHENTICATED);
};

//            !!!MDS!!!

