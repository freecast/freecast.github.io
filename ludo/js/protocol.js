/*
 * 1. message = $header + $body
 *
 * 2. header
 * $MAGIC,$prot_version
 *     MAGIC                "ONLINE"
 *     prot_version         1~FFFF
 *
 * 3. body
 * connect,$username [c2s]  user connects to the game
 * connect_reply,$ret,($error|$ishost,$level:$player_status[])
 *                   [s2c]  send feedback to client for 'connect'
 *     ret                  true/false
 *                          only allow 4 connections at most
 *     ishost               true/false
 *                          game host has some privileges:
 *                              set game level
 *                              set player as unavailable/computer
 *                              override player set by other clients
 *     level                difficult/medium/easy
 *     player_status        $color:$user_type:$isready:$username
 *                          color         red/green/yellow/blue
 *                          user_type     unavailable/nobody/human/computer
 *                          isready       true/false
 *                          username      could be an empty or normal string
 *     error                when ret == false, shows String of reason
 *
 * setlevel:$level   [c2s]  set the AI level of computer player
 * setlevel_notify:$level
 *                   [s2c]  broadcast to clients new $level is set
 *
 * pickup:$color:$user_type
 *                   [c2s]  pickup as $user_type with $color pawns
 * pickup_notify:$player_status
 *                   [s2c]  broadcast to clients about $player_status
 *
 * getready          [c2s]  user is ready to play the game
 * getready_notify:$color[]
 *                   [s2c]  broadcast to other clients that $color[] is/are ready to start game
 *
 * disready          [c2s]  mark user is not ready now
 * disready_notify:$color[]
 *                   [s2c]  broadcast to other clients that $color[] become(s) unready for the game
 *
 * disconnect        [c2s]
 * disconnect_notify:$color[]
 *                   [s2c]  broadcast to other clients that $color[] get(s) disconnected
 *
 * setashost_notify  [s2c]  when original host leaves game,
 *                          notify the new picked up user to be the new game host,
 *                          other clients won't receive this notification
 *
 * startgame_notify  [s2c]
 *
 * endofgame_notify: [s2c]
 *
 * reset             [c2s]  reset the game
 * reset_notify:     [s2c]  notify all clients game is reset
 *
 * 4. example flow
 *    ==Bob==          ==chromecast==           ==Alice==             ==Chandler==
 *    connect   -->
 *              <--    connect_reply
 *
 *    setlevel  -->
 *              <--    setlevel_reply
 *
 *                                       <--    connect
 *                     connect_reply     -->
 *
 *                                                             <--    connect
 *                     connect_reply                           -->
 *
 *    pickup    -->
 *              <--    pickup_reply
 *                     pickup_notify     -->
 *
 *                                       <--    pickup
 *                     pickup_reply      -->
 *              <--    pickup_notify                           -->
 *
A*    getready  -->
 *              <--    getready_reply
 *                     getready_notify   -->                   -->
 *
 *                                       <--    getready
 *                     getready_reply    -->
 *              <--    getready_notify                         -->
 *
 *                                                             <--    getready
 *                     getready_reply                          -->
 *              <--    getready_notify   -->
B*              <--    startgame_notify  -->
 *
 *              <--    endofgame_notify  -->
 *
 *    repeat A->B
 *                     disconnect_notify -->                   -->
 *                     setashost_notify -->
 *                     pickup_notify     -->                   -->
 *
 *                     endofgame_notify  -->                   -->
 */

// Anonymous namespace 
(function(global) {
LudoProtocol.MAGIC = 'ONLINE';

LudoProtocol.COMMAND = {
	connect:           'connect',

	setlevel:          'setlevel',

	pickup:            'pickup',

	getready:          'getready',

	disready:          'disready',

	disconnect:        'disconnect',
    setashost:         'setashost',

	reset:             'reset',
	startgame:         'startgame',
	endofgame:         'endofgame',
};

ERROR = {
	EPERM:        'not enough privilege',
	ECONN:        'not connected',
	ECOMM:        'invalid command',
	EVER:         'invalid protocol version',
	EVERMISMATCH: 'protocol version mismatching with that in use',
	EMAGIC:       'invalid protocol magic',
	EBUSY:        'busy',
};

function LudoProtocol() {
    this.prot_version = 0; /* could accept any supported version */
};

LudoProtocol.prototype.parseProt_1_onConnect = function(senderID, msgObj) {
	try {
		if (game.stat === GAME_STATUS.WAIT_FOR_DICE ||
				game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
			console.log("game already started, user connection disallowed");
			throw ERROR.EBUSY;
		}

		var user = new User(User.TYPE.HUMAN, User.UNREADY,
				msgObj.username, senderID);
		ret = game.addUser(user);
		if (ret.val && user.ishost) {
			console.log('LudoProtocol version(' +
						msgObj.prot_version +
						') is set the same as host');
			this.prot_version = msgObj.prot_version;
			game.waitForStartOfGame();
		}

		var reply = new Object();
		reply.command = LudoProtocol.COMMAND.connect + '_reply';
		reply.ret = ret.val;
		if (ret.val) {
			reply.ishost = user.ishost;
			reply.level = game.level;
			reply.player_status = [];
			for (i=0; i<game.players.length; i++) {
				var p = game.players[i];
				var ps = new Object();
				var user = p.getUser();

				ps.color = p.color;
				ps.user_type = user.type;
				ps.isready = user.isready;
				ps.username = user.name;

				reply.player_status.push(ps);
			}
		} else {
			reply.error = ret.detail;
		}
		this.sendMsg(senderID, reply);
	} catch (err) {
		console.error('onConnect error: ' + err);
		reply.ret = false;
		reply.error = err;
		this.sendMsg(senderID, reply);
	}
};

LudoProtocol.prototype.parseProt_1_onPickup = function(senderID, msgObj) {
	var reply = {};
	reply.command = LudoProtocol.COMMAND.pickup + '_reply';

	try {
		var request_user = game.getUserFromSenderID(senderID);
		if (request_user == null)
			throw ERROR.ECONN;
		var target_user_type = msgObj.user_type;
		if (User.checkUserType(target_user_type) == false)
			throw "unsupported user type " + target_user_type;

		var player = game.getPlayerFromColor(msgObj.color);
		var current_user = player.getUser();

		if (target_user_type == current_user.type)
			throw "no change for user type";

		console.log("player-" + msgObj.color + " " +
				"ishost:" + request_user.ishost + " requests change: " +
				"" + current_user.type + "->" + target_user_type);
		if (request_user.ishost == true) {
			if (target_user_type == User.TYPE.COMPUTER)
				new_user = game.user_computer;
			else if (target_user_type == User.TYPE.UNAVAILABLE)
				new_user = game.user_unavailable;
			else if (target_user_type == User.TYPE.NOBODY)
				new_user = game.user_nobody;
			else if (target_user_type == User.TYPE.HUMAN)
				new_user = request_user;
		} else if (current_user.type == User.TYPE.COMPUTER ||
				current_user.type == User.TYPE.UNAVAILABLE ||
				target_user_type == User.TYPE.COMPUTER ||
				target_user_type == User.TYPE.UNAVAILABLE) {
			throw ERROR.EPERM;
		} else if (target_user_type == User.TYPE.HUMAN) {
			if (current_user.type == User.TYPE.NOBODY) {
				new_user = request_user;
			} else {
				throw "target_user_type human: can't get here";
			}
		} else if (target_user_type == User.TYPE.NOBODY) {
			if (current_user.type == User.TYPE.HUMAN) {
				if (request_user == current_user) {
					new_user = game.user_nobody;
				} else {
					throw ERROR.EPERM;
				}
			} else {
				throw "target_user_type nobody: can't get here";
			}
		} else {
			throw "onPickup: can't get here";
		}

		player.setUser(new_user);

		reply.ret = true;
		this.sendMsg(senderID, reply);

		var broadcastMsg = {};
		broadcastMsg.command =
			LudoProtocol.COMMAND.pickup + '_notify';
		var player_status = {};
		player_status.color = msgObj.color;
		player_status.user_type = target_user_type;
		player_status.isready = new_user.isready;
		player_status.username = new_user.name;
		broadcastMsg.player_status = player_status;
		this.broadcast(broadcastMsg);

		// pick up a computer could also kick off a game
		if (game.isReady()) {
			this.broadcastStartGame();
			game.start();
		}
	} catch (err) {
		console.log("pickup error: " + err);
		reply.ret = false;
		reply.error = err;
		this.sendMsg(senderID, reply);
		return;
	}
};

LudoProtocol.prototype.parseProt_1_onDisconnect = function(senderID, msgObj) {
	try {
		game.onDisconnect(senderID);
	} catch (err) {
		console.log("disconnect error: " + err);
	}
};

LudoProtocol.prototype.parseProt_1_onGetReady = function(senderID, msgObj) {
	var reply = {};
	reply.command = LudoProtocol.COMMAND.getready + '_reply';
	try {
		var request_user = game.getUserFromSenderID(senderID);
		var orig_isready = request_user.isready;
		request_user.isready = true;
		reply.ret = true;

		this.sendMsg(senderID, reply);

		var broadcastMsg = {};
		broadcastMsg.command = LudoProtocol.COMMAND.getready + '_notify';
		broadcastMsg.colors = [];
		for (p in request_user.players) {
			broadcastMsg.colors.push(p);
		}
		this.broadcast(broadcastMsg);

		if (orig_isready == false && game.isReady()) {
			this.broadcastStartGame();
			game.start();
		}
	} catch(err) {
		console.error('getready error: ' + err);
		reply.ret = false;
		reply.error = err;
		this.sendMsg(senderID, reply);
	}
};

LudoProtocol.prototype.parseProt_1_onReset = function(senderID, msgObj) {
	var reply = {};
	reply.command = LudoProtocol.COMMAND.reset + '_reply';
	try {
		var request_user = game.getUserFromSenderID(senderID);

		if (request_user.ishost === false)
			throw ERROR.EPERM;

		game.reset();

		var broadcastMsg = {};
		broadcastMsg.command = LudoProtocol.COMMAND.reset + '_notify';
		this.broadcast(broadcastMsg);
	} catch(err) {
		console.error('reset error: ' + err);
		reply.ret = false;
		reply.error = err;
		this.sendMsg(senderID, reply);
	}
};

LudoProtocol.prototype.broadcastStartGame = function() {
	console.log('eveybody is ready, let us go!');
	broadcastMsg = {};
	broadcastMsg.command =
		LudoProtocol.COMMAND.startgame + '_notify';
	this.broadcast(broadcastMsg);
};

LudoProtocol.prototype.broadcastEndOfGame = function() {
	console.log('broadcasting game over');
	broadcastMsg = {};
	broadcastMsg.command =
		LudoProtocol.COMMAND.endofgame + '_notify';
	this.broadcast(broadcastMsg);
};

LudoProtocol.prototype.setAsHost = function(senderID) {
	var msg = {};
	msg.command = LudoProtocol.COMMAND.setashost + '_notify';
	try {
		this.sendMsg(senderID, msg);
	} catch(err) {
		console.error('setashost error: ' + err);
		msg.ret = false;
		msg.error = err;
		this.sendMsg(senderID, msg);
	}
};

LudoProtocol.prototype.parseProt_1 = function(senderID, msgObj) {
	try {
		switch (msgObj.command) {
			case LudoProtocol.COMMAND.connect:
				this.parseProt_1_onConnect(senderID, msgObj);
				break;

			case LudoProtocol.COMMAND.setlevel:
				break;

			case LudoProtocol.COMMAND.pickup:
				this.parseProt_1_onPickup(senderID, msgObj);
				break;

			case LudoProtocol.COMMAND.getready:
				this.parseProt_1_onGetReady(senderID, msgObj);
				break;

			case LudoProtocol.COMMAND.disready:
				break;

			case LudoProtocol.COMMAND.disconnect:
				this.parseProt_1_onDisconnect(senderID, msgObj);
				break;

			case LudoProtocol.COMMAND.reset:
				this.parseProt_1_onReset(senderID, msgObj);
				break;

			default:
				break;
		}
	} catch (err) {
    	console.log('parseProt_1 error: ' + err);
		return false;
	}
};

LudoProtocol.prototype.parseMsg = function (senderID, msgObj) {
	try {
		if (senderID === undefined)
			throw "senderID not defined";

        if (msgObj.MAGIC !== "ONLINE")
            throw ERROR.EMAGIC;

		if (msgObj.command === undefined)
			throw ERROR.ECOMM;
        if (this.prot_version !== 0) {
        	console.log("check msg.prot_version against protocol version in use");
			if (!(msgObj.prot_version >= 1 && msgObj.prot_version <=1))
				throw ERROR.EVER;
        	if (msgObj.prot_version != this.prot_version)
        	    throw ERROR.EVERMISMATCH;
        }

        if (msgObj.prot_version === 1) {
            this.parseProt_1(senderID, msgObj);
        } else {
            throw ERROR.EVER;
        }
    } catch(err) {
    	console.error('parseMsg error: ' + err);
		msgObj.command = msgObj.command + "_reply";
		msgObj.ret = false;
		msgObj.error = err;
		this.sendMsg(senderID, msgObj, true);
    }
};

LudoProtocol.prototype.sendMsg = function (senderID, msgObj, keepHeader) {
	if (game.isChromeCast === false)
		return;
	if (keepHeader !== true) {
		msgObj.MAGIC = LudoProtocol.MAGIC;
		msgObj.prot_version = this.prot_version;
	}
	game.messageBus.send(senderID, JSON.stringify(msgObj));
};

LudoProtocol.prototype.broadcast = function (msgObj) {
	if (game.isChromeCast === false)
		return;
	msgObj.MAGIC = LudoProtocol.MAGIC;
	msgObj.prot_version = this.prot_version;
	game.messageBus.broadcast(JSON.stringify(msgObj));
};

global.LudoProtocol = LudoProtocol;
}(this));
