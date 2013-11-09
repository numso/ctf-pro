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
    users: {}
  },
  b: {
    points: 0,
    users: {}
  }
};

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
    shots: 0
  };
  teams[team].users[id] = user;
  users[id] = user;

  socket.emit('conn', {
    team: user.team
  });
  socket.broadcast.emit('new', {
    id: user.id,
    team: user.team
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

    socket.broadcast.emit('shot', data);
  });

  socket.on('kill', function(data){
    if(!data.id) return;
    ++users[data.id].kills;
  });
}