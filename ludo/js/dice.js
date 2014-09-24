var Dice = function (parent) {
    this.value = 1;
    this.parent = parent;
    this.init();
    this.busy = false;
    this.isFocused = false;
    this.firstThrow = true;
    this.color = undefined;
};

Dice.prototype.size = 50;

Dice.prototype.roll = function (callback, cb_outofbusy) {
    var that = this,
        $dice;

    if (this.$elem) {
        if (this.busy)
            return;
        this.busy = true;

		if (game.countDownPlayer) {
			console.log("start roll, so stopCountDown player-" +
					game.getCurrentPlayer().color);
			game.countDownPlayer.stopCountDown();
		}

		that.blur();

        $dice = this.$elem.find('.dice');
        this.$elem.addClass('throw');

        setTimeout(function () {
            var vals = [1, 2, 3, 4, 5, 6, 6], // increased chance of rolling 6
                newValue = vals[~~(Math.random() * 7)];

            Sfx.play('dice');
            if(newValue === 6)
            {
            	setTimeout(Sfx.play('rolled_6'), 300);
            }

            $dice
                .removeClass('dice-' + that.value)
                .addClass('dice-' + newValue);

            that.$elem.removeClass('throw');

            that.value = newValue;
			console.log("dice.roll(): " + newValue);
			setTimeout(function() {
				if (typeof callback === 'function')
					callback(newValue);
				setTimeout(function() {
					that.busy = false;
					if (typeof cb_outofbusy === 'function')
						cb_outofbusy(newValue);
				}, 300);
			}, 600);
        }, 200);
    }
};

Dice.prototype.getValue = function() {
    return this.value;
};

Dice.prototype.move = function (player) {
    var positions = {
        2: [3, 8],
        3: [3, 3],
        4: [8, 3],
        5: [8, 8]
    },
    pos = positions[player] || [5, 5];

    if (this.$elem) {
        this.$elem.css({
            top: (this.size * pos[1]) + 'px',
            left: (this.size * pos[0])+ 'px'
        });
    }
};

Dice.prototype.focus = function () {
    this.$elem.addClass('focused');
    this.$diceelem.addClass('focused');
    this.isFocused = true;
	//this.showHint();
};

Dice.prototype.blur = function () {
    this.$elem.removeClass('focused');
    this.$diceelem.removeClass('focused');
    this.isFocused = false;
	//this.hideHint();
};

Dice.prototype.setPlayer = function(player) {
	if (this.color !== undefined) {
        this.$elem.removeClass('dice-wrap-' + this.color);
    }
    this.color = player.color;
    this.$elem.addClass('dice-wrap-' + this.color);
}

Dice.prototype.showHint = function () {
    this.$hint.removeClass('hide');
};
Dice.prototype.hideHint = function () {
    this.$hint.addClass('hide');
};

Dice.prototype.init = function () {
    var that = this,
        hint = $('<div />').addClass('dice-hint');

	hint.addClass('hide');
    this.$hint = hint;
    this.$diceelem = $('<div />')
                .addClass('dice')
                .bind({
                    mouseover: function () {
                        that.focus();
                    },
                    mouseout: function () {
                        that.blur();
                    },
                    click: function () {
                        if (!that.busy && that.isFocused) {
                            if (that.firstThrow) {
                                that.hideHint();
                                that.firstThrow = false;
                            }
                            that.roll(rollDoneHandler);
                        }
                    }
                });
    this.$elem = this.$elem || $('<div>')
            .addClass('dice-wrap')
            .append(this.$diceelem)
            .append(hint)
            .appendTo('#' + this.parent);
};
