
var sfxgame = new Phaser.Game(1, 1, Phaser.CANVAS, 'phaser-example', { preload: preload, create: create });

function preload() {

    sfxgame.load.audio('dice', ['sounds/dice.ogg']);
    sfxgame.load.audio('move', ['sounds/move.mp3']);
    sfxgame.load.audio('rolled_6', ['sounds/rolled_6.wav']);
    sfxgame.load.audio('plane_up', ['sounds/plane_up.wav']);
    sfxgame.load.audio('plane_fall', ['sounds/plane_fall.wav']);
    sfxgame.load.audio('jump4', ['sounds/jump4.ogg']);
    sfxgame.load.audio('fly_across', ['sounds/fly_across.ogg']);
    sfxgame.load.audio('win_cheer', ['sounds/win_cheer.ogg']);
    sfxgame.load.audio('win_fly_back_home', ['sounds/win_fly_back_home.ogg']);

}

var diceaudio;
var moveaudio;

function create() {

    diceaudio = sfxgame.add.audio('dice');
    moveaudio = sfxgame.add.audio('move');
    rolled_6audio = sfxgame.add.audio('rolled_6');
    plane_upaudio = sfxgame.add.audio('plane_up'); 
    plane_fallaudio = sfxgame.add.audio('plane_fall');
    jump4audio = sfxgame.add.audio('jump4');    
    fly_acrossaudio = sfxgame.add.audio('fly_across');
    win_cheeraudio = sfxgame.add.audio('win_cheer');
    win_fly_back_homeaudio = sfxgame.add.audio('win_fly_back_home');       

}


(function (global) {
    var sfx = {
  },
        isAvailable = (function () {
            return !!(Audio && Audio.prototype.play);
        }());

    function play(name, callback) {
        var snd;

        if (sfx[name]) {
            snd = new Audio();
            if (typeof callback === 'function') {
                snd.addEventListener('ended', callback);
            }
            
        }
        if(name == 'dice'){        	
        		diceaudio.play();
        	}
        	
        if(name == 'move'){        	
        		moveaudio.play();
        	} 
        	
        if(name == 'rolled_6'){        	
        		rolled_6audio.play();
        	}        	
        	
        if(name == 'plane_up'){        	
        		plane_upaudio.play();
        	}        	
        	
        if(name == 'plane_fall'){        	
        		plane_fallaudio.play();
        	}        	
        if(name == 'jump4'){        	
        		jump4audio.play();
        	}        	
        	
        if(name == 'fly_across'){        	
        		fly_acrossaudio.play();
        	}        	
        if(name == 'win_fly_back_home'){        	
        		win_fly_back_homeaudio.play();
        	}
        if(name == 'win_cheer'){        	
        		win_cheeraudio.play();
        	}           	       	
        	
    }

    global.Sfx = {
        play: play,
        isAvailable: function () {
            return isAvailable;
        }
    };
}(this));