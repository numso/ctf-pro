/* global PIXI, $, requestAnimationFrame, TESTMAP, io, console, _, Howl */
'use strict';

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (cb) { window.setTimeout(cb, 1000 / 60); };

var names = ['Donut', 'Penguin', 'Stumpy', 'Whicker', 'Shadow', 'Howard', 'Wilshire', 'Darling', 'Disco', 'Jack', 'The Bear', 'Sneak', 'The Big L', 'Whisp', 'Wheezy', 'Crazy', 'Goat', 'Pirate', 'Saucy', 'Hambone', 'Butcher', 'Walla Walla', 'Snake', 'Caboose', 'Sleepy', 'Killer', 'Stompy', 'Mopey', 'Dopey', 'Weasel', 'Ghost', 'Dasher', 'Grumpy', 'Hollywood', 'Tooth', 'Noodle', 'King', 'Cupid', 'Prancer'];
var SPEED = 10;
var BULLETSPEED = 30;
var newNicks = {};

var assets = ['resources/player.json', 'img/bottom.png', 'img/middle.png'];
var loader = new PIXI.AssetLoader(assets);
loader.onComplete = function () {
  loadGame();
};
loader.load();


var players = {};
var socket;
var gameInProgress = false;
var yourTeam;

var bullets = [];
var gunCoolDown = 0;

var renderer;
var stage;
var map;
var player;
var redFlag, blueFlag;
var inputs = [];
var obstacles = [];


var intro = new Howl({
    urls: ['/snd/intro.mp3'],
    loop: true
  });

var gameMusic = new Howl({
  urls: ['/snd/gameMusic.mp3'],
  loop: true
});

var muted = false;
$('#muteButton').click(function () {
  muted = !muted;
  if (muted) {
    intro.mute();
    gameMusic.mute();
    $(this).text('Unmute');
  } else {
    gameMusic.unmute();
    intro.unmute();
    $(this).text('Mute');
  }
});

function loadGame() {
  renderer = new PIXI.autoDetectRenderer(1400, 600);
  $('#view').after(renderer.view);
  stage = new PIXI.Stage();

  loadMapTextures();
  map = createMap();
  stage.addChild(map);

  player = createPlayer();
  stage.addChild(player.sprite);

  redFlag = createFlag('/img/redFlag.png', 50, 1100);
  blueFlag = createFlag('/img/blueFlag.png', 7885, 860);
  map.addChild(redFlag);
  map.addChild(blueFlag);

  startIO();

  requestAnimationFrame(animate);
}

function createPlayer() {
  var playerList = [];
  for (var i = 0; i < 3; ++i) {
    playerList.push(new PIXI.Texture.fromFrame(i));
  }
  var player = new PIXI.DisplayObjectContainer();
  player.position.x = 700;
  player.position.y = 300;
  player._width = 20;
  player._height = 20;

  var playerSprite = new PIXI.MovieClip(playerList);
  playerSprite.pivot.x = 10;
  playerSprite.pivot.y = 10;
  playerSprite.animationSpeed = 0.2;
  playerSprite.scale.x = 2;
  playerSprite.scale.y = 2;
  player.addChild(playerSprite);

  var nickName = new PIXI.Text('');
  player.addChild(nickName);

  return {
    sprite: player,
    dude: playerSprite,
    nick: nickName
  };
}

function createFlag(location, x, y) {
  var flagTexture = new PIXI.Texture.fromImage(location);
  var flag = new PIXI.Sprite(flagTexture);

  flag.position.x = x;
  flag.position.y = y;

  return flag;
}

function createMap() {
  var i, j, id, tempSprite;

  var map = new PIXI.DisplayObjectContainer();
  for (i = 0; i < TESTMAP.bottom.length; ++i) {
    for (j = 0; j < TESTMAP.bottom[i].length; ++j) {
      id = TESTMAP.bottom[i][j];
      tempSprite = PIXI.Sprite.fromFrame('bot-' + id);
      tempSprite.position.x = i * 40;
      tempSprite.position.y = j * 40;
      map.addChild(tempSprite);
    }
  }

  for (i = 0; i < TESTMAP.middle.length; ++i) {
    for (j = 0; j < TESTMAP.middle[i].length; ++j) {
      id = TESTMAP.middle[i][j];
      if (id === null) continue;
      tempSprite = PIXI.Sprite.fromFrame('mid-' + id);
      tempSprite.position.x = i * 40;
      tempSprite.position.y = j * 40;
      tempSprite._width = 40;
      tempSprite._height = 40;
      obstacles.push(tempSprite);
      map.addChild(tempSprite);
    }
  }

  map.visible = false;

  return map;
}

function loadMapTextures() {
  var i, j, tempTexture;
  var size = 40;
  var botTexture = new PIXI.Texture.fromImage('img/bottom.png');
  var midTexture = new PIXI.Texture.fromImage('img/middle.png');

  for (i = 0; i < 8; ++i) {
    // load bot
    for (j = 0; j < 6; ++j) {
      tempTexture = new PIXI.Texture(botTexture, { x: i * size, y: j * size, width: size, height: size });
      PIXI.TextureCache['bot-' + ((j * 8) + i)] = tempTexture;
    }

    // load mid
    for (j = 0; j < 7; ++j) {
      tempTexture = new PIXI.Texture(midTexture, { x: i * size, y: j * size, width: size, height: size });
      PIXI.TextureCache['mid-' + ((j * 8) + i)] = tempTexture;
    }
  }
}

function animate() {
  renderer.render(stage);
  requestAnimationFrame(animate);
  if (gameInProgress) {
    playerMovement(inputs);
    if (gunCoolDown > 0)
      gunCoolDown -= 1;
    loopBullets();
  }
  networkUpdate();
}

function loopBullets() {
  var playerDeath = false;
  for (var i = 0; i < bullets.length; ++i) {
    var bullet = bullets[i];

    bullet.spr.position.x += bullet.dx;
    bullet.spr.position.y += bullet.dy;

    var bulletDeath = false;

    for (var j = 0; j < obstacles.length && !bulletDeath; ++j) {
      if (collidesBullet(bullet.spr, obstacles[j])) {
        bulletDeath = true;
      }
    }

    var pseudoPlayer = {
      position: {
        x: 0,
        y: 0,
        w: 20,
        h: 20
      }
    };

    if (!bulletDeath && bullet.id !== 'me' && collidesBullet(bullet.spr, pseudoPlayer)) {
      bulletDeath = true;
      playerDeath = true;
    }

    if (bulletDeath) {
      map.removeChild(bullet.spr);
      bullets.splice(i--, 1);
    }
  }

  if (playerDeath) {
    console.log('KILL THE PLAYER');
  }
}

function collidesBullet(bullet, object) {
  var bp = bullet.position;
  var op = object.position;

  if (bp.x < op.x + (op.w || 40) && op.x < bp.x + 4) {
    if (bp.y < op.y + (op.h || 40) && op.y < bp.y + 4) {
      return true;
    }
  }

  return false;
}

function networkUpdate() {
  for (var key in players) {
    var player = players[key];

    if (player.deleted) {
      if (player.sprite)
        map.removeChild(player.sprite);
      delete players[key];
      continue;
    }

    if (!player.sprite) {
      var newP = createPlayer();
      player.sprite = newP.sprite;
      player.dude = newP.dude;
      player.nick = newP.nick;
      map.addChild(player.sprite);
      player.dude.play();
    }

    if (newNicks[key]) {
      setNick(newNicks[key], player);
      delete newNicks[key];
    }

    player.sprite.position.x = player.x;
    player.sprite.position.y = player.y;
  }
}

function playerMovement(inputs) {
  var moved = false;
  var desiredRot = 0;
  if (inputs[37] && move(1, 0, Math.PI)) {
    moved = true;
    desiredRot = Math.PI;
  }
  else if (inputs[39] && move(-1, 0, 0)) {
    moved = true;
    desiredRot = 2 * Math.PI;
  }

  if (inputs[38] && move(0, 1, Math.PI * 3 / 2)) {
    moved = true;
    if (!desiredRot)
      desiredRot = 3 * Math.PI / 2;
    else
      desiredRot = (desiredRot + 3 * Math.PI / 2) / 2;
  }
  else if (inputs[40] && move(0, -1, Math.PI / 2)) {
    moved = true;
    if (!desiredRot)
      desiredRot = Math.PI / 2;
    else {
      desiredRot += Math.PI / 2;
      desiredRot %= 2 * Math.PI;
      desiredRot /= 2;
    }
  }

  if (moved) {
    player.dude.play();
    rotate(player.dude, desiredRot);
    sendCoords(player.sprite.position.x - map.position.x, player.sprite.position.y - map.position.y);
  } else {
    player.dude.stop();
  }

  if (inputs[32]) playerFire();
}

function playerFire() {
  if (gunCoolDown) return;
  gunCoolDown = 30;
  var p = player.sprite.position;
  var m = map.position;
  var data = {
    x: p.x - m.x,
    y: p.y - m.y,
    d: toDegrees(player.dude.rotation) - 90
  };
  socket.emit('shot', data);
  bullets.push(createBullet(data));
}

function createBullet(data) {
  var spr = new PIXI.Graphics();
  spr.beginFill(0x000000);
  spr.drawCircle(0, 0, 4);
  spr.endFill();
  spr.position.x = data.x;
  spr.position.y = data.y;
  map.addChild(spr);

  return {
    id: data.id || 'me',
    dx: Math.sin(toRadians(-data.d)) * BULLETSPEED,
    dy: Math.cos(toRadians(-data.d)) * BULLETSPEED,
    spr: spr
  };
}

function move(x, y) {
  if (detectCollision(map.position.x + (x * SPEED), map.position.y + (y * SPEED))) {
   return false;
  }
  map.position.x += x * SPEED;
  map.position.y += y * SPEED;
  return true;
}

function detectCollision(x, y) {
  var flag = false;
  _.each(obstacles, function(obs) {
    if (collides(obs, player.sprite, x, y)) {
      flag = true;
    }
  });
  return flag;
}

function collides(obj, player, offsetX, offsetY) {
  var myX = player.position.x - offsetX;
  var myY = player.position.y - offsetY;
  if (myX + player._width > obj.position.x && myX < obj.position.x + obj._width)
    if (myY + player._height  > obj.position.y && myY < obj.position.y + obj._height)
      return true;

  return false;
}

function rotate(player, desiredRot) {
  if (!desiredRot) return;

  var playRot = toDegrees(player.rotation) || 360;
  var desiRot = toDegrees(desiredRot) || 360;
  if (desiRot === playRot) return;

  if (Math.abs(playRot - desiRot) % 360 < 10) {
    player.rotation = toRadians(desiRot);
    return;
  }

  var diff = playRot - desiRot;
  var change = diff < 0 ? 1 : -1;
  if (Math.abs(diff) > 180) change = 0 - change;
  player.rotation += change * Math.PI / 20;
}

function toDegrees(angle) {
  var val = (angle * (180 / Math.PI)) % 360;
  return (val + 360) % 360;
}

function toRadians(angle) {
  var val = (angle * (Math.PI / 180));
  return val;
}

window.addEventListener('keydown', function (e) {
  inputs[e.keyCode] = true;
});

window.addEventListener('keyup', function (e) {
  inputs[e.keyCode] = false;
  if (e.keyCode === 32) gunCoolDown = 0;
});

function setStartCoords(team, isNew) {
  var startX = team === 'a' ? 40   : 7720;
  var endX   = team === 'a' ? 300  : 7940;
  var startY = team === 'a' ? 760  : 600;
  var endY   = team === 'a' ? 1500 : 1380;

  var x = Math.floor(Math.random() * (endX - startX) + startX);
  var y = Math.floor(Math.random() * (endY - startY) + startY);

  map.position.x = player.sprite.position.x - x;
  map.position.y = player.sprite.position.y - y;
  map.visible = true;

  sendCoords(x, y);

  if (isNew) {
    var nick = names[Math.floor(Math.random() * names.length)];
    socket.emit('chat', { msg: '/setNick ' + nick });
    setNick(nick, player);
  }
}

function setNick(nick, aPlayer) {
  if (!aPlayer || !aPlayer.sprite) return;
  var nickSprite = new PIXI.Text(nick);
  nickSprite.position.x = -nickSprite.width / 2;
  nickSprite.position.y = 35;
  aPlayer.sprite.removeChild(aPlayer.nick);
  aPlayer.nick = nickSprite;
  aPlayer.sprite.addChild(aPlayer.nick);
}

function startIO() {
  socket = io.connect();

  socket.on('conn', function (data) {
    console.log(data);
    gameInProgress = data.go;
    if (!gameInProgress) {
      $('#countdown').text('WAITING FOR PLAYERS');
      intro.play().fade(0, 1);
    } else {
      gameMusic.play();
    }
    var yourTeam = data.team;
    setStartCoords(yourTeam, true);

    for (var key in data.teams.a.users) {
      players[key] = data.teams.a.users[key];
      newNicks[key] = players[key].nickname;
    }
    for (key in data.teams.b.users) {
      players[key] = data.teams.b.users[key];
      newNicks[key] = players[key].nickname;
    }
  });

  socket.on('new', function (data) {
    players[data.id] = data;
  });

  socket.on('dis', function (data) {
    players[data.id].deleted = true;
  });

  socket.on('pos', function (data) {
    players[data.id] = players[data.id] || data;
    getCoords(data.id, data.x, data.y);
  });

  socket.on('countdown', function (data) {
    $('#countdown').text('Game in ' + data.sec);
  });

  socket.on('go', function () {
    $('#countdown').text('GO!!');
    setTimeout(function () {
      $('#countdown').text('');
    }, 1000);
    gameInProgress = true;
    intro.stop();
    gameMusic.play();
  });

  socket.on('stop', function () {
    gameMusic.stop();
    intro.play();
    gameInProgress = false;
    setStartCoords(yourTeam);
    $('#countdown').text('WAITING FOR PLAYERS');
    if (t) clearInterval(t);
    $('#timer').text('');
  });

  socket.on('shot', function (data) {
    bullets.push(createBullet(data));
  });

  socket.on('togo', function (data) {
    setTimer(data.min);
  });

  socket.on('msg', function (data) {
    console.log('msg');
    console.log(data);
    if (data.nick) {
      newNicks[data.id] = data.nick;
    }
  });
}

function sendCoords(x, y) {
  if (!socket) return;
  socket.emit('move', {
    x: x,
    y: y
  });
}

function getCoords(id, x, y) {
  players[id].x = x;
  players[id].y = y;
}

var t;
function setTimer(num) {
  var mins = num;
  var secs = 0;
  if (t) clearInterval(t);
  t = setInterval(function () {
    secs -= 1;
    if (secs < 0) {
      secs += 60;
      mins -= 1;
    }

    var minShow = (mins === 0) ? '' : (mins + ':');
    var secShow = ((secs < 10) ? '0' : '') + secs;
    $('#timer').text(minShow + secShow);
  }, 1000);
}
