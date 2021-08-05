// =============================================================================
// sprites
// =============================================================================

function Hero(game, x, y) {
    Phaser.Sprite.call(this, game, x, y, 'hero');
    this.anchor.set(0.5, 0.5);
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;
    this.animations.add('stop', [0]);
    this.animations.add('run', [1, 2], 8, true);    // 8fps, looped
    this.animations.add('jump', [3]);
    this.animations.add('fall', [4]);
    this.animations.add('die', [5, 6, 5, 6, 5, 6, 5, 6], 12); // 12fps no loop
    // this.animations.play('stop');
}

Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

Hero.prototype.move = function (direction) {
    if (this.isFrozen) return;
    const SPEED = 200;
    this.body.velocity.x = direction * SPEED;
    if (this.body.velocity.x < 0) this.scale.x = -1;        // face left
    else if (this.body.velocity.x > 0) this.scale.x = 1;    // face right
};

Hero.prototype.jump = function () {
    const JUMP_SPEED = 400;
    let canJump = this.body.touching.down && this.alive && !this.isFrozen;
    if (canJump || this.isBoosting) {
        this.body.velocity.y = -JUMP_SPEED;
        this.isBoosting = true;
    }
    return canJump;
};

Hero.prototype.bounce = function () {
    const BOUNCE_SPEED = 200;
    this.body.velocity.y = -BOUNCE_SPEED;
};

Hero.prototype.stopJumpBoost = function () {
    this.isBoosting = false;
};

Hero.prototype.freeze = function () {
    this.body.enable = false;       // disable physics
    this.isFrozen = true;
};

Hero.prototype.die = function () {
    this.body.enable = false;       // disable physics
    this.alive = false;
    this.animations.play('die').onComplete.addOnce(function () {
        this.kill();
    }, this);
};

Hero.prototype._getAnimationName = function () {
    let name = 'stop';
    if (!this.alive) name = 'die';
    else if (this.isFrozen) name = 'stop';  // level transition
    else if (this.body.velocity.y < 0) name = 'jump';
    else if (this.body.velocity.y >= 0 && !this.body.touching.down) name = 'fall';
    else if (this.body.velocity.x !== 0 && this.body.touching.down)  name = 'run';
    return name;
};

Hero.prototype.update = function () {
    let animationName = this._getAnimationName();
    if (this.animations.name !== animationName) {
        this.animations.play(animationName);
    }
};

// =============================================================================

function Spider(game, x, y) {
    Phaser.Sprite.call(this, game, x, y, 'spider');
    this.anchor.set(0.5);
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;
    this.body.velocity.x = Spider.SPEED;
    this.animations.add('crawl', [0, 1, 2], 8, true);
    this.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);
    this.animations.play('crawl');
}

Spider.SPEED = 100;
Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;

Spider.prototype.update = function () { // touched by wall, blocked by world bound
    if (this.body.touching.right || this.body.blocked.right) {
        this.body.velocity.x = -Spider.SPEED;
    } else if (this.body.touching.left || this.body.blocked.left) {
        this.body.velocity.x = Spider.SPEED;
    }
};

Spider.prototype.die = function () {
    this.body.enable = false;       // disable physics
    this.animations.play('die').onComplete.addOnce(function () {
        this.kill();
    }, this);
};

// =============================================================================
// Loading state
// =============================================================================

LoadingState = {};

LoadingState.init = function () {
    this.game.renderer.renderSession.roundPixels = true;    // non-blurry pixels
};

LoadingState.preload = function () {
    this.game.load.json('level:0', 'data/level00.json');
    this.game.load.json('level:1', 'data/level01.json');

    this.game.load.image('background', 'images/background.png');
    this.game.load.image('ground', 'images/ground.png');
    this.game.load.image('grass:8x1', 'images/grass_8x1.png');
    this.game.load.image('grass:6x1', 'images/grass_6x1.png');
    this.game.load.image('grass:4x1', 'images/grass_4x1.png');
    this.game.load.image('grass:2x1', 'images/grass_2x1.png');
    this.game.load.image('grass:1x1', 'images/grass_1x1.png');
    this.game.load.image('invisible-wall', 'images/invisible_wall.png');
    this.game.load.image('key', 'images/key.png');

    this.game.load.spritesheet('hero', 'images/hero.png', 36, 42);
    this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);
    this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);
    this.game.load.spritesheet('door', 'images/door.png', 42, 66);
    this.game.load.spritesheet('decoration', 'images/decor.png', 42, 42);

    this.game.load.image('icon:coin', 'images/coin_icon.png');
    this.game.load.image('font:numbers', 'images/numbers.png');    // bitmap font
    this.game.load.spritesheet('icon:key', 'images/key_icon.png', 34, 30);

    this.game.load.audio('sfx:jump', 'audio/jump.wav');
    this.game.load.audio('sfx:coin', 'audio/coin.wav');
    this.game.load.audio('sfx:stomp', 'audio/stomp.wav');
    this.game.load.audio('sfx:key', 'audio/key.wav');
    this.game.load.audio('sfx:door', 'audio/door.wav');
    this.game.load.audio('bgm', ['audio/bgm.mp3', 'audio/bgm.ogg']);
};

LoadingState.create = function () {
    this.game.state.start('play', true, false, {level: 0});     // keep preloaded cache, but not created entities
};

// =============================================================================
// Play state
// =============================================================================

PlayState = {};
const LEVEL_COUNT = 2;

PlayState.init = function (data) {
    this.keys = this.game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
        right: Phaser.KeyCode.RIGHT,
        up: Phaser.KeyCode.UP
    });
    this.coinPickupCount = 0;
    this.hasKey = false;
    this.level = (data.level || 0) % LEVEL_COUNT;   // return to L0 after all levels complete
};

PlayState.create = function () {
    this.camera.flash('#000000');   // fade from black
    this.sfx = {
        jump: this.game.add.audio('sfx:jump'),
        coin: this.game.add.audio('sfx:coin'),
        stomp: this.game.add.audio('sfx:stomp'),
        key: this.game.add.audio('sfx:key'),
        door: this.game.add.audio('sfx:door'),
    };
    this.bgm = this.game.add.audio('bgm');
    this.bgm.loopFull();

    this.game.add.image(0, 0, 'background');
    this._loadLevel(this.game.cache.getJSON(`level:${this.level}`));
    this._createScoreboard();
};

PlayState.shutdown = function () {
    this.bgm.stop();
};

PlayState.update = function () {
    this._handleCollisions();
    this._handleInput();
    this.coinFont.text = `x${this.coinPickupCount}`;
    this.keyIcon.frame = this.hasKey ? 1 : 0;
};

PlayState._handleCollisions = function () {
    this.game.physics.arcade.collide(this.hero, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
    this.game.physics.arcade.overlap(this.hero, this.coins, this._onHeroVsCoin, null, this);
    this.game.physics.arcade.overlap(this.hero, this.spiders, this._onHeroVsEnemy, null, this);
    this.game.physics.arcade.overlap(this.hero, this.key, this._onHeroVsKey, null, this);
    this.game.physics.arcade.overlap(this.hero, this.door, this._onHeroVsDoor, function (hero, door) { 
        return this.hasKey && hero.body.touching.down;      // filter
    }, this);
};

PlayState._handleInput = function () {
    if (this.keys.left.isDown) this.hero.move(-1);
    else if (this.keys.right.isDown) this.hero.move(1);
    else this.hero.move(0);

    const JUMP_HOLD = 200;  // ms
    if (this.keys.up.downDuration(JUMP_HOLD)) { // within period
        let didJump = this.hero.jump();
        if (didJump) this.sfx.jump.play();
    }
    else this.hero.stopJumpBoost();
};

PlayState._createScoreboard = function () { 
    const NUMBERS_STR = '0123456789X ';
    this.coinFont = this.game.add.retroFont('font:numbers', 20, 26, NUMBERS_STR, 6);    // width, height, charPerRow

    this.keyIcon = this.game.make.image(0, 19, 'icon:key');
    this.keyIcon.anchor.set(0, 0.5);        // center vertically
    let coinIcon = this.game.make.image(this.keyIcon.width + 7, 0, 'icon:coin');
    let coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width, coinIcon.height / 2, this.coinFont);
    coinScoreImg.anchor.set(0, 0.5);

    this.scoreboard = this.game.add.group();
    this.scoreboard.position.set(10, 10);
    this.scoreboard.add(this.keyIcon);
    this.scoreboard.add(coinIcon);
    this.scoreboard.add(coinScoreImg);
};

PlayState._onHeroVsCoin = function (hero, coin) {
    this.sfx.coin.play();
    coin.kill();
    this.coinPickupCount++;
};

PlayState._onHeroVsEnemy = function (hero, enemy) {
    this.sfx.stomp.play();
    if (hero.body.velocity.y > 0) {
        hero.bounce();
        enemy.die();
    } else {
        hero.die();
        this.events.onKilled.addOnce(function () {
            this.game.state.restart(true, false, {level: this.level});
        }, this);
        // enemy.body.touching = enemy.body.wasTouching;   // prevent spider bouncing on hero
    }
};

PlayState._onHeroVsKey = function (hero, key) {
    this.sfx.key.play();
    key.kill();
    this.hasKey = true;
};

PlayState._onHeroVsDoor = function (hero, door) {
    this.sfx.door.play();
    door.frame = 1;     // open door
    hero.freeze();
    this.game.add.tween(hero)       // animation
        .to({ x: this.door.x, alpha: 0 }, 500, null, true)  // duration, no easing, autostart
        .onComplete.addOnce(this._goToNextLevel, this);
};

PlayState._goToNextLevel = function () {
    this.camera.fade('#000000');
    this.camera.onFadeComplete.addOnce(function () {
        this.game.state.restart(true, false, { level: this.level + 1 });    // keep preloaded cache, but not created entities
    }, this);
};

// =============================================================================

PlayState._loadLevel = function (data) {
    const GRAVITY = 1200;
    this.game.physics.arcade.gravity.y = GRAVITY;

    this.platforms = this.game.add.group();
    this.enemyWalls = this.game.add.group();
    this.enemyWalls.visible = false;
    data.platforms.forEach(this._spawnPlatform, this);

    this.bgDecoration = this.game.add.group();
    this._spawnDoor(data.door.x, data.door.y);
    this._spawnKey(data.key.x, data.key.y);
    data.decoration.forEach(function (deco) {
        this.bgDecoration.add(
            this.game.add.image(deco.x, deco.y, 'decoration', deco.frame));
    }, this);

    this.coins = this.game.add.group();
    data.coins.forEach(this._spawnCoin, this);
    
    this.spiders = this.game.add.group();
    this._spawnCharacters({ hero: data.hero, spiders: data.spiders });
};

PlayState._spawnPlatform = function (platform) {
    let sprite = this.platforms.create(platform.x, platform.y, platform.image);
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    sprite.body.immovable = true;

    this._spawnEnemyWall(platform.x, platform.y, 'left');
    this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
};

PlayState._spawnCoin = function (coin) {
    let sprite = this.coins.create(coin.x, coin.y, 'coin');
    sprite.anchor.set(0.5, 0.5);
    sprite.animations.add('rotate', [0, 1, 2, 3], 6, true);     // 6fps, looped
    sprite.animations.play('rotate');
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
};

PlayState._spawnCharacters = function (data) {
    this.hero = new Hero(this.game, data.hero.x, data.hero.y);
    this.game.add.existing(this.hero);

    data.spiders.forEach(function (spider) {
        let sprite = new Spider(this.game, spider.x, spider.y);
        this.spiders.add(sprite);
    }, this);
};

PlayState._spawnEnemyWall = function (x, y, side) {
    let sprite = this.enemyWalls.create(x, y, 'invisible-wall');
    sprite.anchor.set(side === 'left' ? 1 : 0, 1);
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    sprite.body.immovable = true;
};

PlayState._spawnDoor = function (x, y) {
    this.door = this.bgDecoration.create(x, y, 'door');
    this.door.anchor.setTo(0.5, 1);
    this.game.physics.enable(this.door);
    this.door.body.allowGravity = false;
};

PlayState._spawnKey = function (x, y) {
    this.key = this.bgDecoration.create(x, y, 'key');
    this.key.anchor.set(0.5, 0.5);
    this.game.physics.enable(this.key);
    this.key.body.allowGravity = false;
    this.key.y -= 3;
    this.game.add.tween(this.key)       // animation
        .to({ y: this.key.y + 6 }, 800, Phaser.Easing.Sinusoidal.InOut) // duration, easing function
        .yoyo(true).loop().start();
};

// =============================================================================
// entry point
// =============================================================================

var config = {
    type: Phaser.AUTO,
    width: 960, height: 600,
    parent: 'game'
};

window.onload = function () {
    let game = new Phaser.Game(config);
    game.state.add('play', PlayState);
    game.state.add('loading', LoadingState);
    game.state.start('loading');
};