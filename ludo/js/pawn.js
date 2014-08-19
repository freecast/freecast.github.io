var Pawn = function (player, pawnIndex) {
    this.player = player;
    this.pawnIndex = pawnIndex;
    this.position = -1;
    this.init();
    this.isMoving = false;
    this.isFocused = false;
    this.isArrived = false;
};

Pawn.STOP = "STOP";
Pawn.NOT_STOP = "NOT_STOP";

Pawn.prototype.init = function () {
    var that = this;
	var player = this.player;

	var field =
		player.board.getBaseFreeField(this.player.color);
	field.addPawn(this);

	var pawnClass = player.board.getPawnClass(player.color, this.pawnIndex);
    this.$elem = $('<div/>')
        .addClass(pawnClass)
        .css({
            left: field.pixelX + 'px',
            top:  field.pixelY + 'px'
        })
        .bind({
            mouseover: function () {
                if (that.player.isFocused) {
                    that.focus();
                }
            },
            mouseout: function () {
                that.blur();
            },
            click: function () {
                if (!that.isMoving) {
                    that.player.move(that.player.board.dice.getValue(), that);
                }
            }
        });
	this.$elem.css("-webkit-transform", "rotate("+field.rotForPass+"deg)");
};

Pawn.prototype.focus = function () {
    this.$elem.addClass('focused');
    this.isFocused = true;
};


Pawn.prototype.arrive = function () {
    this.$elem.addClass('arrive');
    this.isArrived = true;
    this.blur();
};


Pawn.prototype.blur = function () {
    this.$elem.removeClass('focused');
    this.isFocused = false;
};

Pawn.prototype.move = function (steps, callback) {
    var that = this;

    function doStep(steps, callback) {
        if (steps.length > 1) {
            oneStep = steps.shift();
            that.step.call(that, oneStep, Pawn.NOT_STOP);
            setTimeout(function () {
                doStep(steps, callback);
            }, 300);
        } else {
            oneStep = steps[0];
            that.step.call(that, oneStep, Pawn.STOP);
            if (typeof callback === 'function') {
                callback(oneStep);
            }
        }
    }

    if (steps) {
        this.isMoving = true;
        if (this.field) {
            this.field.removePawn(this);
        }

        doStep(steps, function (lastStep) {
			var field = lastStep.field;
            if (field) {
                field.addPawn(that);
            }
            that.isMoving = false;
            if (typeof callback === 'function') {
                callback();
            }
        });
    }
};

Pawn.prototype.step = function (oneStep, isStop) {
	var rotation = 0;
	//var currentField = this.field;
		//game.board.getField([this.x, this.y]);
	var sfxName = 'move';
	var field = oneStep.field;
	var action = oneStep.action;
	var postAction = oneStep.postAction;

	if (isStop === Pawn.STOP) {
		if (action === ACTION.FLIGHT) {
			/* flight to stop */
			rotation = field.rotForFlightStop;
		} else {
			/* move/jump to stop */
			rotation = field.rotForNormalStop;
		}
	} else {
		if (postAction === ACTION.FLIGHT) {
			/* will takeoff */
			rotation = field.rotForTakeOff;
		} else if (action === ACTION.FLIGHT) {
			/* flight pass is the same as flight stop */
			rotation = field.rotForFlightStop;
		} else {
			/* will move/jump out of field */
			rotation = field.rotForPass;
		}
	}

    if (field) {
        log(this.getKey() + " " + action + "," + isStop + "," + rotation + " " +
			"(" + this.x + "," + this.y + ")->(" + field.x +"," + field.y +")");
        this.x = field.x;
        this.y = field.y;
    }

    if (this.$elem) {
        this.$elem.css({
            left: field.pixelX + 'px',
            top:  field.pixelY + 'px'
        });
		this.$elem.css("-webkit-transform", "rotate("+rotation+"deg)");

		if (action === ACTION.FALL) {
			Sfx.play('plane_fall');
		} else if (action === ACTION.OUTOFBASE) {
			Sfx.play('plane_up');
		} else if (postAction === ACTION.ARRIVE) {
			Sfx.play('move');
			Sfx.play('win_fly_back_home');
		} else if (postAction === ACTION.JUMP) {
			Sfx.play('move');
			Sfx.play('jump4');
		} else if (postAction === ACTION.FLIGHT) {
			Sfx.play('move');
			Sfx.play('fly_across');
		} else {
			Sfx.play('move');
		}
		if (action === ACTION.KILL && field) {
			field.kill(this.player);
		}
	}
};

Pawn.prototype.kill = function (field) {
    if (field) {
		//TODO: play sfx of explosion and back home
        this.move([{action: ACTION.FALL, postAction: ACTION.NONE,
			field: field}]);
        this.position = -1;
    }
};

Pawn.prototype.getKey = function () {
	return "" + this.player.color + this.pawnIndex;
};
