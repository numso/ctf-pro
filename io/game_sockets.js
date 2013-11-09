/*******************************************************************************
 * WRITTEN BY: RICHIE PREECE
 * WRITTEN FOR: NODE KNOCKOUT 2013
 * TEAM: ADALDEN
 * TEAM MEMBERS: RICHIE PREECE, DALLIN OSMUN, JUSTIN PERMANN
 ******************************************************************************/

/* jshint node:true */
'use strict';

var _ = require('underscore');
var mainIO;

var currTimeout;

module.exports = function (io) {
  mainIO = io;
  io.sockets.on('connection', connect);
};

var users = {};
var teams = {
  a: {
    points: 0,
    kills: 0,
    shots: 0,
    stole: 0,
    deaths: 0,
    ffire: 0,
    users: {}
  },
  b: {
    points: 0,
    kills: 0,
    shots: 0,
    stole: 0,
    deaths: 0,
    ffire: 0,
    users: {}
  }
};
var game = {
  started: false,
  countdown: false,
  connected: 0,
  active: 0,
  points: 0,
  kills: 0,
  shots: 0,
  stole: 0,
  deaths: 0,
  ffire: 0,
  teams: teams
};

function countdown(togo){ //togo is seconds
  if(togo == 0){
    game.started = true;
    game.countdown = false;
    mainIO.sockets.emit('go');
    gameleft(15);
  } else {
    mainIO.sockets.emit('countdown', {
      sec: togo
    });
    currTimeout = setTimeout(countdown, 1000, togo - 1);
  }
}

function gameleft(togo){ //togo is minutes
  if(togo == 0){
    stopGame();

    game.countdown = true;
    countdown(15);
  } else {
    mainIO.sockets.emit('togo', {
      min: togo
    });
    currTimeout = setTimeout(gameleft, 1000 * 60, togo - 1);
  }
}

function stopGame(){
  game.started = false;
  game.countdown = false;
  mainIO.sockets.emit('stop', game);
  resetGame();
}

function resetGame(){
  _.each(game, function(element, index, list){
    if(typeof element === 'number'){
      list[index] = 0;
    }
  })

  _.each(users, function(user){
    _.each(user, function(element, index, list){
      if(typeof element === 'number'){
        list[index] = 0;
      }
    });
  });

  _.each(teams, function(team){
    _.each(team, function(element, index, list){
      if(typeof element === 'number'){
        list[index] = 0;
      }
    });
  });
}

function getID(){
  var id = -1;

  do{
    id = Math.floor(Math.random() * 999);
  } while(users[id]);

  return id;
}

function assignTeam(){
  if(_.keys(teams.a.users).length < _.keys(teams.b.users).length){
    return 'a';
  } else {
    return 'b';
  }
}

function connect(socket) {
  var id = getID();
  var team = assignTeam();
  var user = {
    id: id,
    team: team,
    points: 0,
    kills: 0,
    shots: 0,
    stole: 0,
    deaths: 0,
    ffire: 0
  };
  teams[team].users[id] = user;
  users[id] = user;

  ++game.connected;

  if(++game.active >= 2 && !game.countdown && !game.started){
    game.countdown = true;
    countdown(10);
  }

  socket.emit('conn', {
    team: user.team,
    go: game.started
  });
  socket.broadcast.emit('new', {
    id: user.id,
    team: team
  });

  socket.on('disconnect', function(){
    socket.broadcast.emit('dis', {
      id: user.id
    });

    if(--game.active < 2){
      clearTimeout(currTimeout);
      stopGame();
    }

    delete teams[team].users[user.id];
    delete users[user.id];
  });

  socket.on('start', function(data){
    if(!data.x) return;
    if(!data.y) return;

    user.x = data.x;
    user.y = data.y;

    socket.broadcast.emit('pos', {
      id: user.id,
      x: user.x,
      y: user.y
    });
  });

  socket.on('move', function(data){
    if(!data.x) return;
    if(!data.y) return;

    user.x = data.x;
    user.y = data.y;

    socket.broadcast.volatile.emit('pos', {
      id: user.id,
      x: user.x,
      y: user.y
    });
  });

  socket.on('point', function(){
    ++user.points;
    ++teams[team].points;
    ++game.points;

    var result = {
      id: user.id,
      a: teams.a.points,
      b: teams.b.points
    };

    if(teams[team].points === 3){
      clearTimeout(currTimeout);
      stopGame();
    }

    socket.emit('point', result);
    socket.broadcast.emit('point', result);
  });

  socket.on('shot', function(data){
    if(!data.x) return;
    if(!data.y) return;
    if(!data.d) return;
    data.id = user.id;

    ++user.shots;
    ++teams[team].shots;
    ++game.shots;

    socket.broadcast.emit('shot', data);
  });

  socket.on('kill', function(data){
    if(!data.id) return;

    if(user.team == users[data.id].team){
      //Friendly fire
      ++users[data.id].ffire;
      ++teams[users[data.id].team].ffire;
      ++game.ffire;
      
      ++user.deaths;
      ++teams[team].deaths;
      ++game.deaths;
    } else {
      //Legit kill
      ++users[data.id].kills;
      ++teams[users[data.id].team].kills;
      ++game.kills;
      
      ++user.deaths;
      ++teams[team].deaths;
      ++game.deaths;
    }
  });

  socket.on('got', function(){
    ++user.stole;
    ++teams[team].stole;
    ++game.stole;

    socket.broadcast.emit('got', {
      id: user.id
    });
  });

  socket.on('drop', function(){
    socket.broadcast.emit('drop', {
      id: user.id
    });
  })

  socket.on('chat', function(data){
    if(!data.msg) return;

    var msg = {
      id: user.id,
      msg: data.msg
    };

    socket.emit('msg', msg);
    socket.broadcast.emit('msg', msg);
  });
}