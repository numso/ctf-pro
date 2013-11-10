/* global PIXI, $, requestAnimationFrame, TESTMAP, io, console, _, Howl, Howler */
'use strict';

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (cb) { window.setTimeout(cb, 1000 / 60); };

var names = ['Donut', 'Penguin', 'Stumpy', 'Whicker', 'Shadow', 'Howard', 'Wilshire', 'Darling', 'Disco', 'Jack', 'The Bear', 'Sneak', 'The Big L', 'Whisp', 'Wheezy', 'Crazy', 'Goat', 'Pirate', 'Saucy', 'Hambone', 'Butcher', 'Walla Walla', 'Snake', 'Caboose', 'Sleepy', 'Killer', 'Stompy', 'Mopey', 'Dopey', 'Weasel', 'Ghost', 'Dasher', 'Grumpy', 'Hollywood', 'Tooth', 'Noodle', 'King', 'Cupid', 'Prancer'];
var SPEED = 10;
var BULLETSPEED = 3;
var NUM_MESSAGES = 10;
var newNicks = {};

var assets = ['resources/player.json', 'resources/player2.json', 'img/bottom.png', 'img/middle.png', '/img/redFlag.png', '/img/blueFlag.png', '/img/blueFlagIcon.png', '/img/redFlagIcon.png', '/img/blueSkull.png', '/img/redSkull.png'];
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
var redIcon, blueIcon;
var blueScore, redScore;
var blueKillsIcon, redKillsIcon;
var redKills, blueKills;
var kills;
var playerNames = {};
var inputs = [];
var obstacles = [];
var flagCoords = {
  redFlag: {
    x: 100,
    y: 1140
  },
  blueFlag: {
    x: 7935,
    y: 890
  }
};

var intro = new Howl({
    urls: ['/snd/intro.mp3'],
    autoplay: false,
    loop: true
  });

var gameMusic = new Howl({
  urls: ['/snd/gameMusic.mp3'],
  autoplay: false,
  loop: true
});

var muted = false;
var $muteButton = $('#muteButton');
$muteButton.click(mute);

var chatHidden = false;
var $chatButton = $('#chatButton');
$chatButton.click(hideChat);
var $allChats = $('#allChats');

function hideChat() {
  chatHidden = !chatHidden;
  if (chatHidden) {
    $allChats.hide();
    $chatButton.text('Show Chat (c)');
  } else {
    $allChats.show();
    $chatButton.text('Hide Chat (c)');
  }
  $chatButton.blur();
}

function mute() {
  muted = !muted;
  if (muted) {
    Howler.mute();
    $muteButton.text('Unmute (m)');
  } else {
    Howler.unmute();
    $muteButton.text('Mute (m)');
  }
  $muteButton.blur();
}

function loadGame() {
  renderer = new PIXI.autoDetectRenderer(1400, 600);
  $('#view').after(renderer.view);
  $(renderer.view).addClass('center');

  stage = new PIXI.Stage();

  loadMapTextures();
  map = createMap();
  stage.addChild(map);

  redFlag = createFlag('/img/redFlag.png', flagCoords.redFlag.x, flagCoords.redFlag.y);
  blueFlag = createFlag('/img/blueFlag.png', flagCoords.blueFlag.x, flagCoords.blueFlag.y);

  map.addChild(redFlag);
  map.addChild(blueFlag);

  redKillsIcon = createSkull('/img/redSkull.png', 10, 60);
  blueKillsIcon = createSkull('/img/blueSkull.png', 1340, 60);
  setKills(0, 0);

  stage.addChild(blueKillsIcon);
  stage.addChild(redKillsIcon);

  redIcon = createIcon('/img/redFlagIcon.png', 10, 10);
  blueIcon = createIcon('/img/blueFlagIcon.png', 1340, 10);
  setScores(0, 0);

  stage.addChild(redIcon);
  stage.addChild(blueIcon);

  startIO();

  requestAnimationFrame(animate);
}

function setKills(red, blue) {
  if (redKills) stage.removeChild(redKills);
  if (blueKills) stage.removeChild(blueKills);

  redKills = new PIXI.Text(red, {
    fill: '#FFFFFF',
    font: 'bold 40pt Arial'
  });
  blueKills = new PIXI.Text(blue, {
    fill: '#FFFFFF',
    font: 'bold 40pt Arial'
  });

  redKills.position.x = 75;
  redKills.position.y = 60;
  blueKills.position.x = 1300;
  blueKills.position.y = 60;

  stage.addChild(redKills);
  stage.addChild(blueKills);
}

function drawTeams() {
  var teams = [];
  var posY = {
    red: 100,
    blue: 100
  };
  for(var key in newNicks) {
    if (playerNames[key]) {
      stage.removeChild(playerNames[key].sprite);
    }
    var thisPlayer = newNicks[key] ? newNicks[key] : 'Unkown';
    var member = new PIXI.Text(thisPlayer, {
      fill: players[key].team == 'a' ? '#FF0000' : '#0000FF',
      font: 'bold 15pt Arial'
    });

    var X = players[key].team == 'a' ? 10 : 1300;
    var Y = players[key].team == 'a' ? posY.red += 50 : posY.blue += 50;

    setPos(member, X, Y);

    playerNames[key] = {
      sprite: member
    };
  }
}

function setPos(member, x, y) {
  member.position.x = x;
  member.position.y = y;

  stage.addChild(member);
}

function setScores(red, blue) {
  if (redScore) stage.removeChild(redScore);
  if (blueScore) stage.removeChild(blueScore);

  redScore = new PIXI.Text(red, {
    fill: '#FFFFFF',
    font: 'bold 40pt Arial'
  });
  blueScore = new PIXI.Text(blue, {
    fill: '#FFFFFF',
    font: 'bold 40pt Arial'
  });

  redScore.position.x = 75;
  redScore.position.y = 0;
  blueScore.position.x = 1300;
  blueScore.position.y = 0;

  stage.addChild(redScore);
  stage.addChild(blueScore);
};

function createPlayer(team) {
  team = team || 'a';

  var playerList = [];
  for (var i = 0; i < 3; ++i) {
    playerList.push(new PIXI.Texture.fromFrame(team + i));
  }
  var player = new PIXI.DisplayObjectContainer();
  player.position.x = 700;
  player.position.y = 300;
  player._width = 20;
  player._height = 20;

  var gotFlagBubble = new PIXI.Graphics();
  gotFlagBubble.beginFill(team === 'a' ? '0x0000FF' : '0xFF0000', 0.4);
  gotFlagBubble.drawCircle(0, 0, 50);
  gotFlagBubble.position.x = 3;
  gotFlagBubble.position.y = -1;
  gotFlagBubble.endFill();
  gotFlagBubble.visible = false;
  player.addChild(gotFlagBubble);

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
    nick: nickName,
    gotFlag: gotFlagBubble
  };
}

function createSkull(location, x, y) {
  var skullTexture = new PIXI.Texture.fromImage(location);
  var skull = new PIXI.Sprite(skullTexture);
  skull.position.x = x;
  skull.position.y = y;
  skull.width = 50;
  skull.height = 50;
  return skull;
};

function createFlag(location, x, y) {
  var flagTexture = new PIXI.Texture.fromImage(location);
  var flag = new PIXI.Sprite(flagTexture);
  flag.position.x = x;
  flag.position.y = y;
  flag.pivot.x = 50;
  flag.pivot.y = 40;
  return flag;
}

function createIcon(location, x, y) {
  var iconTexture = new PIXI.Texture.fromImage(location);
  var flag = new PIXI.Sprite(iconTexture);
  flag.position.x = x;
  flag.position.y = y;
  flag.width = 50;
  flag.height = 50;
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
  if (gameInProgress) {
    playerMovement(inputs);
    if (gunCoolDown > 0) --gunCoolDown;
    loopBullets();
  }
  networkUpdate();
  requestAnimationFrame(animate);
}

function loopBullets() {
  var playerDeath = false;

  var pseudoPlayer = {
    position: {
      x: player.sprite.position.x - map.position.x,
      y: player.sprite.position.y - map.position.y,
      w: 20,
      h: 20
    }
  };

  for (var i = 0; i < bullets.length; ++i) {
    var bullet = bullets[i];
    var bulletDeath = false;

    for (var k = 0; k < BULLETSPEED; ++k) {
      bullet.spr.position.x += bullet.dx;
      bullet.spr.position.y += bullet.dy;

      if (!bulletDeath && bullet.id !== 'me' && collidesBullet(bullet.spr, pseudoPlayer)) {
        bulletDeath = true;
        playerDeath = bullet.id;
      }
    }

    for (var j = 0; j < obstacles.length && !bulletDeath; ++j) {
      if (collidesBullet(bullet.spr, obstacles[j])) {
        bulletDeath = true;
      }
    }

    if (bulletDeath) {
      map.removeChild(bullet.spr);
      bullets.splice(i--, 1);
    }
  }

  if (playerDeath) {
    socket.emit('died', { id: playerDeath });
    deathSequence(player);
  }
}

function deathSequence(aPlayer) {
  if (aPlayer === player) {
    if (aPlayer.gotFlag.visible) {
      var flag = yourTeam == 'a' ? blueFlag : redFlag;
      flag.position.x = aPlayer.sprite.position.x - map.position.x;
      flag.position.y = aPlayer.sprite.position.y - map.position.y;
      flag.visible = true;

      player.gotFlag.visible = false;
      socket.emit('drop', {
        x: aPlayer.sprite.position.x - map.position.x,
        y: aPlayer.sprite.position.y - map.position.y
      });
    }
    setStartCoords(yourTeam);
  }
}

function collidesBullet(bullet, object) {
  var bp = bullet.position;
  var op = object.position;

  if (bp.x - 10 < op.x + (op.w || 40) && op.x < bp.x + 10) {
    if (bp.y - 10 < op.y + (op.h || 40) && op.y < bp.y + 10) {
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
      var newP = createPlayer(player.team);
      player.sprite = newP.sprite;
      player.dude = newP.dude;
      player.nick = newP.nick;
      player.gotFlag = newP.gotFlag;
      map.addChild(player.sprite);
    }

    if (newNicks[key]) {
      setNick(newNicks[key], player);
      delete newNicks[key];
    }


    if (player.sprite.position.x !== player.x || player.sprite.position.y !== player.y) {
      var deltaX = player.x - player.sprite.position.x;
      var deltaY = player.y - player.sprite.position.y;
      var desiRot = Math.atan2(deltaY, deltaX);
      rotate(player.dude, desiRot);

      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) rotate(player.dude, desiRot);

      player.sprite.position.x = player.x;
      player.sprite.position.y = player.y;

      player.dude.play();
    } else {
      player.dude.stop();
    }
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
    dx: Math.sin(toRadians(-data.d)) * SPEED,
    dy: Math.cos(toRadians(-data.d)) * SPEED,
    spr: spr
  };
}

function move(x, y) {
  if (detectCollision(map.position.x + (x * SPEED), map.position.y + (y * SPEED))) {
   return false;
  }

  map.position.x += x * SPEED;
  map.position.y += y * SPEED;

  var enemyFlag = yourTeam == 'a' ? blueFlag : redFlag;
  var yourFlag = yourTeam == 'a' ? redFlag : blueFlag;
  var coords = yourTeam == 'a' ? flagCoords.redFlag : flagCoords.blueFlag;

  if (collideFlag(map.position.x, map.position.y, enemyFlag.position.x, enemyFlag.position.y)) {
    if (enemyFlag.visible) {
      player.gotFlag.visible = true;
      enemyFlag.visible = false;
      socket.emit('got');
    }
  }
  if (collideFlag(map.position.x, map.position.y, coords.x, coords.y) && player.gotFlag.visible) {
    player.gotFlag.visible = false;
    enemyFlag.visible = true;
    socket.emit('point');
  } else if (collideFlag(map.position.x, map.position.y, yourFlag.position.x, yourFlag.position.y)
    && yourFlag.position.x != coords.x && yourFlag.position.y != coords.y) {
    yourFlag.position.x = coords.x;
    yourFlag.position.y = coords.y;
    socket.emit('return');
  }
  return true;
}

function collideFlag(posX, posY, flagX, flagY) {
  posX = player.sprite.position.x - posX;
  posY = player.sprite.position.y - posY;
  if (posX + player.sprite._width > flagX && posX < flagX + 20)
    if (posY + player.sprite._height > flagY && posY < flagY + 20)
      return true;
  return false;
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
  if (desiredRot === undefined) return;

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

  if (e.keyCode === 77) {
    mute();
  }

  if (e.keyCode === 67) {
    hideChat();
  }

  if (e.keyCode === 84) {
    focusMsgBox();
  }

  if (e.keyCode === 191) {
    focusMsgBox('/');
  }
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
    player = createPlayer(data.team);
    stage.addChild(player.sprite);

    gameInProgress = data.go;
    if (!gameInProgress) {
      setAlertText('WAITING FOR PLAYERS TO JOIN');
      intro.play().fade(0, 1);
    } else {
      gameMusic.play();
    }
    yourTeam = data.team;
    setStartCoords(yourTeam, true);

    for (var key in data.teams.a.users) {
      players[key] = data.teams.a.users[key];
      newNicks[key] = players[key].nickname;
    }
    for (key in data.teams.b.users) {
      players[key] = data.teams.b.users[key];
      newNicks[key] = players[key].nickname;
    }

    if (data.teams.a.flag) {
      if (data.teams.a.flag.id) {
        console.log('SET A\'s FLAG TO BE CARRIED BY ' + data.teams.a.flag.id);
      } else {
        console.log('SET A\'s FLAG TO BE AT ' + data.teams.a.flag.x + ', ' + data.teams.a.flag.y);
      }
    }

    if (data.teams.b.flag) {
      if (data.teams.b.flag.id) {
        console.log('SET B\'s FLAG TO BE CARRIED BY ' + data.teams.b.flag.id);
      } else {
        console.log('SET B\'s FLAG TO BE AT ' + data.teams.b.flag.x + ', ' + data.teams.b.flag.y);
      }
    }

    console.log('SET THE KILL COUNT FOR A TO BE ' + data.teams.a.kills);
    console.log('SET THE KILL COUNT FOR B TO BE ' + data.teams.b.kills);

    console.log('SET THE POINTS FOR A TO BE ' + data.teams.a.points);
    console.log('SET THE POINTS FOR B TO BE ' + data.teams.b.points);
  });

  socket.on('new', function (data) {
    players[data.id] = data;
    drawTeams();
  });

  socket.on('got', function (data) {
    var flag = data.team == 'a' ? blueFlag : redFlag;
    flag.visible = false;
    players[data.id].gotFlag.visible = true;
  });

  socket.on('drop', function (data) {
    players[data.id].gotFlag.visible = false;
    var flag = players[data.id].team == 'a' ? blueFlag : redFlag;
    flag.position.x = data.x;
    flag.position.y = data.y;
    flag.visible = true;
  });

  socket.on('return', function (data) {
    var flag = players[data.id].team == 'a' ? redFlag : blueFlag;
    var coords = players[data.id].team == 'a' ? flagCoords.redFlag : flagCoords.blueFlag;
    flag.position.x = coords.x;
    flag.position.y = coords.y;
    players[data.id].gotFlag.visible = false;
  });

  socket.on('point', function (data) {
    if (players[data.id]) {
      var enemyFlag = players[data.id].team == 'a' ? blueFlag : redFlag;
      var coords = players[data.id].team == 'a' ? flagCoords.blueFlag : flagCoords.redFlag;
      enemyFlag.position.x = coords.x;
      enemyFlag.position.y = coords.y;
      enemyFlag.visible = true;
    }

    setScores(data.a, data.b);
  });

  socket.on('dis', function (data) {
    players[data.id].deleted = true;
    newNicks[data.id] = null;
    drawTeams();
  });

  socket.on('pos', function (data) {
    players[data.id] = players[data.id] || data;
    getCoords(data.id, data.x, data.y);
  });

  socket.on('countdown', function (data) {
    setAlertText('Game in ' + data.sec);
  });

  socket.on('go', function () {
    setAlertText('GO!!', 1000);
    gameInProgress = true;
    intro.stop();
    gameMusic.play();
  });

  socket.on('stop', function () {
    gameMusic.stop();
    intro.play();
    setKills(0, 0);
    setScores(0, 0);
    gameInProgress = false;
    setStartCoords(yourTeam);
    setAlertText('WAITING FOR PLAYERS TO JOIN');
    if (t) clearInterval(t);
    $('#timer').text('');
  });

  socket.on('kills', function (data) {
    setKills(data.a, data.b);
  });

  socket.on('shot', function (data) {
    bullets.push(createBullet(data));
  });

  socket.on('togo', function (data) {
    setTimer(data.min);
  });

  socket.on('msg', function (data) {
    if (data.nick) {
      newNicks[data.id] = data.nick;
      drawTeams();
      return;
    }

    var text = (data.id === -1) ? data.msg : (data.name + ': ' + data.msg);
    var msg = $('<span>').text(text);
    if (data.team) msg.addClass(data.team);

    $allChats.append(msg);

    var children = $allChats.children();
    var len = children.length - NUM_MESSAGES;
    if (len > 0)
      for (var i = 0; i < len; ++i)
        children[i].remove();
  });

  socket.on('alert', function (data) {
    console.log(data);
    setAlertText(data.msg, 1500, data.team);
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

var alertsTimeout;
var $alerts = $('#alerts');
function setAlertText(text, timeout, team) {
  if (alertsTimeout) clearTimeout(alertsTimeout);
  $alerts.removeClass('a');
  $alerts.removeClass('b');
  if (team) $alerts.addClass(team);
  $alerts.text(text);
  if (timeout) {
    alertsTimeout = setTimeout(function () {
      $alerts.text('');
      $alerts.removeClass('a');
      $alerts.removeClass('b');
    }, timeout);
  }
}

var $chatBox = $('#chatBox');
$chatBox.on('keydown', function (e) {
  if (e.keyCode === 27) {
    $chatBox.blur();
  } else if (e.keyCode === 13) {
    var msg = $chatBox.val();
    if (msg) {
      socket.emit('chat', { msg: msg });
      if (msg.indexOf('/setNick ') === 0) {
        setNick(msg.replace('/setNick ', ''), player);
      }
    }
    $chatBox.blur();
  }

  e.stopPropagation();
});

$chatBox.on('blur', killMsgBox);

function killMsgBox() {
  $chatBox.val('');
  $chatBox.hide();
}

function focusMsgBox(msg) {
  if (chatHidden) hideChat();
  $chatBox.show();
  $chatBox.focus();
  setTimeout(function () {
    $chatBox.val(msg || '');
  });
}
