/*******************************************************************************
 * WRITTEN BY: RICHIE PREECE
 * WRITTEN FOR: NODE KNOCKOUT 2013
 * TEAM: ADALDEN
 * TEAM MEMBERS: RICHIE PREECE, DALLIN OSMUN, JUSTIN PERMANN
 ******************************************************************************/

/* jshint node:true */
'use strict';

var _ = require('underscore');

module.exports = function (io) {
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
    users: {}
  },
  b: {
    points: 0,
    kills: 0,
    shots: 0,
    stole: 0,
    deaths: 0,
    users: {}
  }
};
var game = {};

function initGame(){
  game = {
    started: false,
    points: 0,
    kills: 0,
    shots: 0,
    stole: 0,
    deaths: 0
  }
}

function getID(){
  var id = -1;

  do{
    id = Math.floor(Math.random() * 999);
  } while(users[id]);

  return id;
}

function assignTeam(){
  if(_.keys(teams.a).length < _.keys(teams.b).length){
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
    deaths: 0
  };
  teams[team].users[id] = user;
  users[id] = user;

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

    socket.broadcast.emit('pos', {
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

    ++users[data.id].kills;
    ++teams[users[data.id].team].kills;
    ++game.kills;
    
    ++user.deaths;
    ++teams[team].deaths;
    ++game.deaths;
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

initGame();