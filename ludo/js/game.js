var AI_LEVEL = {
	difficult: 'difficult',
	medium:    'medium',
	easy:      'easy',
};

var GAME_STATUS = {
	WAIT_FOR_CONNECTION: 'wait_for_connection',
	WAIT_FOR_READY:      'wait_for_ready',
	WAIT_FOR_DICE:       'wait_for_rolling_dice',
	WAIT_FOR_PAWN:       'wait_for_moving_pawn'
};

	/* CSS are hard coded following these colors*/
var RED = 'red',
    GREEN = 'green',
    YELLOW = 'yellow',
    BLUE = 'blue';

var ACTION = {
	NONE       : "none",

	OUTOFBASE  : "outOfBase",
	NORMAL     : "move",

	JUMP       : "jump",
	FLIGHT     : "flight",
	ARRIVE     : "arrive",

	KILL       : "kill",
	FALL       : "fall",
	RESET      : "reset",
	TURNRIGHT  : "turnright",
};

function Game() {
	this.board = null;
	this.current = -1;
	this.players = [];
	this.playersColorIndex = {};
	this.playerList = null;

	this.proto = new LudoProtocol();

	this.level = AI_LEVEL.medium;

	this.numDone = 0;
	this.num_user = 0;
	this.users = {};

	this.user_computer =
		new User(User.TYPE.COMPUTER, User.READY);
	this.user_unavailable =
		new User(User.TYPE.UNAVAILABLE, User.UNREADY);
	this.user_nobody =
		new User(User.TYPE.NOBODY, User.UNREADY);

	this.user_host = null;

	ua = navigator.userAgent.toLowerCase();
	console.log(ua);
	if (ua.indexOf('windows') >= 0) {
		this.isChromeCast = false;
	} else {
		this.isChromeCast = true;
	}

	// UI element
	this.uiWelcome = $('#welcome');
	this.uiContent = $('#content');

	// for test only
	this.user_test = null;
	this.pickupIndex = 0;
}

Game.prototype = {
	showUI_waitForConnection: function () {
		this.uiWelcome.show();
		this.uiContent.hide();
	},

	showUI_waitForStartOfGame: function() {
		this.uiWelcome.hide();
    /*<div id="content">
        <div id="board"></div>
        <div id="sidebar">
            <div class="arrow"></div>
            <ul id="players-list"></ul>
        </div>
    </div>*/
		this.uiContent.show();
	},

	waitForStartOfGame: function() {
		if (this.stat === GAME_STATUS.WAIT_FOR_READY)
			return;
		this.stat = GAME_STATUS.WAIT_FOR_READY;
		this.showUI_waitForStartOfGame();
	},

	getCurrentPlayer : function () {
		return this.players[this.current];
	},
	getPlayerFromIndex : function (index) {
		return this.players[index] || null;
	},
	getPlayerFromColor : function (color) {
		return this.playersColorIndex[color] || null;
	},

    playAward : function () {
        this.board.dice.focus();
        this.board.dice.showHint();
        this.stat = GAME_STATUS.WAIT_FOR_DICE;
    },

    nextPlayer : function () {
        var next = this.current,
            arrow = $('.arrow'),
            i = 0;

        if (this.numDone == 4) {
            this.getCurrentPlayer().blur();
			arrow.hide();
            console.log('all players are done, need to restart the game');
            return;
        }

        while (this.players[i]) {
            this.players[i].blur();
            i++;
        }

        arrow.removeClass('arrow-' + this.current);
        i = 0;
        while (i < 4) {
            if (next == 3) {
                next = 0;
            } else {
                next++;
            }
			var user = this.players[next].getUser();
			if (user.type === User.TYPE.UNAVAILABLE ||
					user.type === User.TYPE.NOBODY) {
				console.log("skip player-" + this.players[next].color +
						' user_type:' + user.type);
				i++;
				continue;
			}
            if (this.players[next].numArrived == 4) {
				console.log("skip finished player-" + this.players[next].color);
                i++;
                continue;
            }
            break;
        }
        if (this.current >= 0)
            console.log("player switch from " +
				this.getCurrentPlayer().color + " " +
				"to " + this.getPlayerFromIndex(next).color);
        else
            console.log("player " + this.getPlayerFromIndex(next).color + " starts");
        this.current = next > 3 ? 0 : next;
        arrow.addClass('arrow-' + this.current);
		arrow.show();
        //game.players[game.current].focus();
        this.board.dice.focus();
        this.board.dice.showHint();
        this.board.dice.setPlayer(this.getCurrentPlayer());
        this.stat = GAME_STATUS.WAIT_FOR_DICE;
    },

	addPlayer: function (name, color, user) {
    	var player = new Player(name, color, this.board);

        this.players.push(player);
		this.playersColorIndex[color] = player;

        // todo convert to component with focus indicator etc.
		var inner = '<div class="icon"></div>';
        this.playerList.append(
            '<li id="li-' + color + '" class="player player-' + color + '">' + inner + '</li>'
        );

        player.setUser(user);
    },

    addUser: function (user) {
		if (this.users[user.senderID]) {
			console.error("error: user " + user.senderID + " already added");
			return {val: false, detail: "already added"};
		}
		if (this.num_user == 4) {
			console.error("error: already 4 users");
			return {val: false, detail: "exceed maximum connections"};
		}
		this.users[user.senderID] = user;
		this.num_user++;
		if (this.num_user == 1) {
			user.ishost = true;
			this.user_host = user;
			console.log("user " + user.name + " is chosen to be the host");
		}
		return {val: true, detail: ""};
	},

	getUserFromSenderID : function (senderID) {
		return this.users[senderID] || null;
	},

	onDisconnect: function(senderId) {
		var user = this.users[senderId];
		if (user === undefined) {
			console.log('user senderId:' + senderId + ' is not connected');
			return;
		}
		console.log('senderId:' + senderId + 'name:' + user.name + ' disconnected');
		var c, p, notify={}, player_status={}, isChangePlayer = false;
		notify.command = LudoProtocol.COMMAND.pickup + '_notify';
		notify.player_status = player_status;
		for (c in user.players) {
			p = user.players[c];
			p.setUser(this.user_nobody);
			p.resetPawns();
			if (p === this.getCurrentPlayer())
				isChangePlayer = true;

			player_status.color     = p.color;
			player_status.user_type = p.getUser().type;
			player_status.isready   = p.getUser().isready;
			player_status.username  = p.getUser().name;

			this.proto.broadcast(notify);
		}
		if (this.user_host === user) {
			console.log('host disconnected');
			this.user_host = null;
		}
		delete this.users[senderId];
		this.num_user--;
		if (this.num_user === 0) {
			$('.arrow').hide();
			this.board.dice.blur();
			this.current = -1;
		} else if (isChangePlayer) {
			this.nextPlayer();
		}
	},

	isReady: function() {
		var i = 0, p, u;
		while (p = game.players[i]) {
			u = p.getUser();
			if (u.type == User.TYPE.NOBODY) {
				console.log('player ' + p.color +
						' is not allocated a user do NOT start game');
				return false;
			}
			if (u.type == User.TYPE.HUMAN && u.isready == false) {
				console.log('player ' + p.color + ' user ' + u.name +
						' is not ready, do NOT start game');
				return false;
			}
			i++;
		}
		return true;
	},

	start: function() {
		// pickup a player
		this.nextPlayer();

		if (this.stat !== GAME_STATUS.WAIT_FOR_DICE)
			return;

		if (this.getCurrentPlayer().getUser().type === User.TYPE.COMPUTER)
			this.board.dice.roll(rollDoneHandler,
					rollDoneHandler_outofbusy);
	},
}; // end of game.prototype


(function (global) {
	function initChromecast() {
		if (game.isChromeCast === false) {
			console.log('skip chromecast initialization');
			return;
		}

        console.log('init chrome cast handler');
        cast.receiver.logger.setLevelValue(0);
        game.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
        console.log('Starting Receiver Manager');

        // handler for the 'ready' event
        game.castReceiverManager.onReady = function(event) {
          console.log('Received Ready event: ' + JSON.stringify(event.data));
          game.castReceiverManager.setApplicationState("Application status is ready...");
        };

        // handler for 'senderconnected' event
        game.castReceiverManager.onSenderConnected = function(event) {
          console.log('Received Sender Connected event: ' + event.data);
          console.log(game.castReceiverManager.getSender(event.data).userAgent);
        };

        // handler for 'senderdisconnected' event
        game.castReceiverManager.onSenderDisconnected = function(event) {
          console.log('Received Sender Disconnected event: ' + event.data +
				  ' from ' + event.senderId);
		  game.onDisconnect(event.senderId);
          if (game.castReceiverManager.getSenders().length == 0) {
            window.close();
          }
        };

        // handler for 'systemvolumechanged' event
        game.castReceiverManager.onSystemVolumeChanged = function(event) {
          console.log('Received System Volume Changed event: ' + event.data['level'] + ' ' +
              event.data['muted']);
        };

        // create a CastMessageBus to handle messages for a custom namespace
        game.messageBus =
          game.castReceiverManager.getCastMessageBus(
              'urn:x-cast:com.google.cast.sample.helloworld');

        // initialize the CastReceiverManager with an application status message
        game.castReceiverManager.start({statusText: "Application is starting"});
        console.log('Receiver Manager started');

        // handler for the CastMessageBus message event
        game.messageBus.onMessage = function(event) {
          console.log('Message [' + event.senderId + ']: ' + event.data);
          // display the message from the sender
          //displayText(event.data);
          // inform all senders on the CastMessageBus of the incoming message event
          // sender message listener will be invoked
          //game.messageBus.send(event.senderId, event.data+"_test");

          var msg = event.data;
          console.log("onMessage msg.command=" + msg.command);
          console.log("onMessage msg.COMMAND=" + msg.COMMAND);
          handlemsg(event.senderId, event.data);
        }
	};

    function onload() {
		var game = new Game();

		global.game = game;
        game.playerList = $('#players-list');

        console.log('init game');

        game.board = new BoardSTD('board');
        game.board.dice = new Dice('content');

        game.addPlayer('Player 1', RED,    game.user_nobody);
        game.addPlayer('Player 2', GREEN,  game.user_nobody);
        game.addPlayer('Player 3', YELLOW, game.user_nobody);
        game.addPlayer('Player 4', BLUE,   game.user_nobody);

        game.stat = GAME_STATUS.WAIT_FOR_CONNECTION;
//        game.nextPlayer();

		initChromecast();

		game.showUI_waitForConnection();
    }

    function rollDoneHandler(newValue) {
        var player = game.getCurrentPlayer();

        console.log('rollDoneHandler inbusy: currentPlayer=' + player.color +
				' dice=' + newValue);

        if ((game.board.getBaseFreeField(player.color) === null) &&
                (newValue !== 6)) {
            game.nextPlayer();
        } else {
			// TODO: select a pawn before focus the player
            game.getCurrentPlayer().focus();
            game.stat = GAME_STATUS.WAIT_FOR_PAWN;
        }
    }
	function rollDoneHandler_outofbusy(diceValue) {
        var player = game.getCurrentPlayer();
		var user = player.getUser();

        console.log('rollDoneHandler postbusy: currentPlayer=' + player.color +
				' dice=' + diceValue);

		if (user.type != User.TYPE.COMPUTER) {
			return;
		}
		if (game.stat === GAME_STATUS.WAIT_FOR_DICE) {
            game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
		} else if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
			player.selectPawnAndMove(diceValue);
		}
	};

    function handlemsg_prehistoric(channel, msg) {
        var player = game.getCurrentPlayer();
        var pawn = player.getCurrentPawn();

        console.log("'" + msg +
			"' received in handlemsg from channel " + channel);

        if (msg === 'join') {
            var i = game.pickupIndex;
            if (i <= 1) {
                game.players[2*i].channel = channel;
                game.players[2*i+1].channel = channel;
                console.log('player ' + 2*i + ' and ' + 2*i+1 +
                    ' are allocated to channel ' + channel);
                i++;
                game.pickupIndex = i;
            } else {
                console.log('no more players could be allocated');
            }
            return;
        }

		var currentChannel = player.getUser().senderID;
        if (currentChannel != channel) {
            console.log("" + channel + ", it's not your turn, but for " +
					currentChannel);
            return;
        }

        if (msg === 'click') {
            if (game.stat === GAME_STATUS.WAIT_FOR_DICE) {
                game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
            } else if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
                player.move(game.board.dice.getValue(), pawn);
            }
        } else if (msg === 'next') {
            if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
                player.nextPawn();
            }
        } else if (msg === 'prev') {
            if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
                player.prevPawn();
            }
        }
    }

    function handlemsg(channel, msg) {
        console.log("'" + msg +
			"' received in handlemsg from channel " + channel);

        if (typeof msg === "string") {
            var msgObj = null;
            try {
                var msgObj = JSON.parse(msg);
                game.proto.parseMsg(channel, msgObj);
            } catch(err) {
                console.log('not a json string, try prehistoric way');
                handlemsg_prehistoric(channel, msg);
            }
        } else if (typeof msg === "object") {
            game.proto.parseMsg(channel, msg);
        } else {
        	console.log("not supported 'typeof msg': " + typeof msg);
        }
    }

    document.onkeydown = function(event) {
        console.log('key ' + event.keyCode + ' pressed!');
        if (event.keyCode === 13 /*'enter'*/) {
            handlemsg(game.testChannel, 'click');
			//handlemsg(0, '{"command":"connect","MAGIC":"ONLINE","username":"alice","prot_version":1}');
        } else if (event.keyCode === 37 /*left*/) {
            handlemsg(game.testChannel, 'prev');
        } else if (event.keyCode === 39 /*right*/) {
            handlemsg(game.testChannel, 'next');
        } else if (event.keyCode === 65 /*'a'*/) {
			if (typeof computer_kicked_off !== 'undefined') {
				console.log("computer battle already started");
				return;
			}
			console.log("computer battle starts");
			computer_kicked_off = true;

			game.playersColorIndex[RED].setUser(game.user_computer);
			game.playersColorIndex[GREEN].setUser(game.user_computer);
			game.playersColorIndex[YELLOW].setUser(game.user_computer);
			game.playersColorIndex[BLUE].setUser(game.user_computer);

            game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
        } else if (event.keyCode === 85 /*'u'*/) {
			if (game.user_test)
				return;
			game.testChannel = "testChannel";
			game.user_test =
				new User(User.TYPE.HUMAN, User.READY, "test",
						game.testChannel);
			game.playersColorIndex[RED].setUser(game.user_test);
			game.playersColorIndex[GREEN].setUser(game.user_computer);
			game.playersColorIndex[YELLOW].setUser(game.user_unavailable);
			game.playersColorIndex[BLUE].setUser(game.user_computer);
		} else if (event.keyCode === 67 /* 'c' connect*/) {
			if (game.num_user !== 0) {
				console.log('host already connected, nothing to do');
				return;
			}
			game.testChannel = "testChannel";
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"connect", "username":"test"}');
		} else if (event.keyCode === 80 /* 'p'*/) {
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"pickup", "color":"red", "user_type":"human"}');
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"pickup", "color":"green", "user_type":"human"}');
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"pickup", "color":"yellow", "user_type":"human"}');
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"pickup", "color":"blue", "user_type":"human"}');
		} else if (event.keyCode === 82 /* 'r' getready*/) {
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"getready"}');
		} else if (event.keyCode === 68 /* 'd' disconnect*/) {
			game.testChannel = "testChannel";
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"disconnect"}');
		}
    }

    global.addEventListener('load', function () {
        onload();
    });

	//TODO export as less as possible
	global.rollDoneHandler = rollDoneHandler;
	global.rollDoneHandler_outofbusy = rollDoneHandler_outofbusy;
}(this));
