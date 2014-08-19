var Player = function (name, color, board) {
    this.name = name;
    this.color = color;
    this.board = board;
    this.initPath();
    this.initPawns();
    this.isFocused = false;
    this.isFinished = false;
    this.numArrived = 0;
    this.isMoving = false;

    this.user = null;
};

Player.prototype.setUser = function(user) {
	if (this.user)
		this.user.removePlayer(this);

	this.board.updatePlayerList(this.color, user.name);

    this.user = user;
	user.addPlayer(this);

	console.log("player-" + this.color +
			" is occupied by user '" + user.name + "'");
};

Player.prototype.getUser = function() {
	return this.user || null;
};

Player.prototype.initPath = function () {
	this.path = this.board.getPath(this.color);
	this.arrivePosition = this.board.getArrivePosition(this.color);
};

Player.prototype.initPawns = function () {
    var i = 0, pawn;

    this.pawns = [];

    for (i = 0; i < 4; i++) {
        pawn = new Pawn(this, i);
        this.pawns[i] = pawn;
        this.board.add(pawn.$elem);
    }
    this.currentPawn = 0;
};

Player.prototype.resetPawns = function () {
    var i = 0,
        field,
        pawn;

	while (this.isMoving)
		console.log('wait for player-' + this.color + ' to stop');

    for (i = 0; i < 4; i++) {
        pawn = this.pawns[i];
		if (pawn.position === -1)
			continue;
        field = this.board.getBaseFreeField(this.color);
        if (field) {
            pawn.move([{action: ACTION.RESET,
				field: field}]);
        } else {
			console.log("no base field for " + pawn.getKey());
		}
    }
    this.currentPawn = 0;
};

Player.prototype.getCurrentPawn = function () {
    return this.pawns[this.currentPawn] || null;
}

Player.prototype.getNextAvailPawnIndex = function () {
    var current = this.currentPawn;
    var i = 0;

    while (i < 4) {
        if (current == 3) {
            current = 0;
        } else {
            current++;
        }
        if (this.pawns[current].isArrived) {
            i++;
            continue;
        } else {
            break;
        }
    }
    return current;
}

Player.prototype.nextPawn = function () {
    var prev = this.currentPawn;

    this.pawns[prev].blur();
    this.currentPawn = this.getNextAvailPawnIndex();
    this.pawns[this.currentPawn].focus();
}
Player.prototype.prevPawn = function () {
    var prev = this.currentPawn;
    var current = this.currentPawn;
    var i = 0;

    while (i < 4) {
        if (current == 0) {
            current = 3;
        } else {
            current--;
        }
        if (this.pawns[current].isArrived) {
            i++;
            continue;
        } else {
            break;
        }
    }
    this.pawns[prev].blur();
    this.currentPawn = current;
    this.pawns[this.currentPawn].focus();
}

Player.prototype.selectPawnAndMove = function(diceValue) {
	// TODO: simply select a pawn for diceValue
	// if current pawn is OK, that's it
	// otherwise do some simple search

	if (this.pawns[this.currentPawn].position >= 0) {
		this.move(diceValue, this.pawns[this.currentPawn]);
		return;
	}

	i = 0;
	while (this.pawns[i]) {
		if (this.pawns[i].isArrived == false &&
				this.pawns[i].position >= 0) {
			this.move(diceValue, pawn);
			return;
		}
		i++;
	}
	if (diceValue == 6)
		this.move(diceValue, this.pawns[this.currentPawn]);
	else
		console.log("no pawn selected to move, currentPawn=" +
				this.currentPawn + " pos=" +
				this.pawns[this.currentPawn].position);
};

Player.prototype.focus = function () {
    this.isFocused = true;
    this.getCurrentPawn().focus();
};

Player.prototype.blur = function () {
    this.isFocused = false;
    this.getCurrentPawn().blur();
};

Player.prototype.move = function (distance, pawn) {
    var steps = [],
        destPawns,
        nextPos,
        dest, destField,
		killFields = [],
        i,
        switchPlayer = false;

    if (!this.isFocused || !pawn) {
        return false;
    }

    if (this.isMoving) {
        log("avoid move reentrance for player " + this.color);
        return false;
    }

    this.isMoving = true;
    // pawn is still inside base
    if (pawn.position < 0) {
        if (distance !== 6) {
            this.isMoving = false;
            return false;
        }
        // enter the board
        nextPos = 0;
		var f = this.board.getField(this.path[0]);
        steps.push({action: ACTION.OUTOFBASE, postAction: ACTION.NONE, field: f});
        switchPlayer = false;
    // pawn is moving on the board
    } else {
        nextPos = pawn.position + distance;
        var fields = this.path.slice(pawn.position + 1, nextPos + 1);
        if (fields.length) {
            i = 0;
            while (fields[i]) {
                steps.push({action: ACTION.NORMAL, postAction: ACTION.NORMAL,
					field: this.board.getField(fields[i])});
                i++;
            }
			steps[steps.length-1].postAction = ACTION.NONE;
        }
        if(distance == 6)
        {
        	switchPlayer = false;
        }else{
        switchPlayer = true;
      }
    }
	if (nextPos > this.arrivePosition)
		nextPos = this.arrivePosition -
					(nextPos - this.arrivePosition);
	dest = this.path[nextPos];
	destField = this.board.getField(dest);

	function checkKill(player, destF) {
		var destP = destF.getPawns();
		if (destP.length > 0 && destP[0].player !== player)
			return true;
		return false
	};

	if (nextPos < this.arrivePosition) {
		if (checkKill(this, destField)) {
			steps[steps.length-1].action = ACTION.KILL;
			killFields.push(destField);
		}
	} else if (nextPos === this.arrivePosition) {
        var field = this.board.getBaseFreeField(this.color);
        if (field) {
			steps[steps.length-1].postAction = ACTION.ARRIVE;
            steps.push({action: ACTION.ARRIVE, postAction: ACTION.NONE,
				field: field});
        } else {
			this.isMoving = false;
            console.log('no field for pawn back to base');
			return false;
        }
    } else {
        this.isMoving = false;
        console.log("out of range nextPos = " + nextPos);
        return false;
    }

	// considering JUMP/FLIGHT
	if (killFields.length === 0 && destField.color === this.color) {
		if (destField.action === ACTION.JUMP) {
			steps[steps.length-1].postAction = ACTION.JUMP;

			nextPos = nextPos + this.board.getJUMPdelta(destField);
			destField = this.board.getField(this.path[nextPos]);
			steps.push({action: ACTION.JUMP, postAction: ACTION.NONE,
				field: destField});

			if (checkKill(this, destField)) {
				steps[steps.length-1].action = ACTION.KILL;
				killFields.push(destField);
			}

			if (killFields.length === 0 && destField.action === ACTION.FLIGHT) {
				steps[steps.length-1].postAction=ACTION.FLIGHT;

				var flyAcrossField = this.board.getFlyAcrossField(this.color);
				nextPos = nextPos + this.board.getFLIGHTdelta(destField);
				destField = this.board.getField(this.path[nextPos]);

				if (checkKill(this, flyAcrossField)) {
					killFields.push(flyAcrossField);
					steps.push({action: ACTION.KILL, postAction: ACTION.FLIGHT,
						field: flyAcrossField});
				}
				steps.push({action: ACTION.FLIGHT, postAction: ACTION.NONE,
					field: destField});

				if (checkKill(this, destField)) {
					steps[steps.length-1].action = ACTION.KILL;
					killFields.push(destField);
				}
			}
		} else if (destField.action === ACTION.FLIGHT) {
			steps[steps.length-1].postAction=ACTION.FLIGHT;

			var flyAcrossField = this.board.getFlyAcrossField(this.color);
			var isKill1, isKill2;
			nextPos = nextPos + this.board.getFLIGHTdelta(destField);
			destField = this.board.getField(this.path[nextPos]);

			if (isKill1 = checkKill(this, flyAcrossField)) {
				killFields.push(flyAcrossField);
				steps.push({action: ACTION.KILL, postAction: ACTION.FLIGHT,
					field: flyAcrossField});
			}
			steps.push({action: ACTION.FLIGHT, postAction: ACTION.JUMP,
				field: destField});

			if (isKill2 = checkKill(this, destField)) {
				steps[steps.length-1].action = ACTION.KILL;
				steps[steps.length-1].postAction = ACTION.NONE;
				killFields.push(destField);
			}

			if (isKill1 === false && isKill2 === false) {
				nextPos = nextPos + this.board.getJUMPdelta(destField);
				destField = this.board.getField(this.path[nextPos]);
				steps.push({action: ACTION.JUMP, postAction: ACTION.NONE,
					field: destField});

				if (checkKill(this, destField)) {
					steps[steps.length-1].action = ACTION.KILL;
					killFields.push(destField);
				}
			}
		}
	}

    log("player " + this.color + " is moving to path[" + nextPos + "]:" +
        this.path[nextPos]);

    pawn.move(steps,
        function() {
            var player = pawn.player;

            /*if (killFields.length > 0) {
				for (var e in killFields)
					killFields[e].kill(player);
			}*/

            if (nextPos == player.arrivePosition) {
                pawn.arrive();
                player.numArrived++;
                if (player.numArrived == 4) {
                    game.numDone++;
					console.log("player-" + player.color +
						" finished, force switchPlayer = true");
					switchPlayer = true;
                }
            }

            pawn.position = nextPos;
            console.log(pawn.getKey() + ' finished moving');

            if ((pawn.position === player.arrivePosition) &&
					(player.numArrived < 4)) {
                player.currentPawn = player.getNextAvailPawnIndex();
                log('player ' + player.color + ':' + pawn.pawnIndex +
                    ' arrived, pick up pawn ' + player.getCurrentPawn().pawnIndex);
            }

            if (switchPlayer) {
                game.nextPlayer();
            } else {
                log('player ' + player.color + ':' + pawn.pawnIndex +
                    ' is onboard, roll dice again');
                game.playAward();
            }
            player.isMoving = false;

			// TODO: if it's time for computer to roll
			//       do it automatically
			player = game.getCurrentPlayer();
			user = player.getUser();

			if (user.type != User.TYPE.COMPUTER)
				return;
			if (game.stat === GAME_STATUS.WAIT_FOR_DICE) {
				game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
			} else
				console.log("game status error: " + game.stat);
        });

    return true;
};
