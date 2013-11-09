/* jshint node:true */
'use strict';

var _ = require('underscore');

module.exports = function (io) {
  io.sockets.on('connection', connect);
};

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
    team: team
  };
  teams[team].users[id] = user;

  socket.emit('conn', user);
  socket.broadcast.emit('new', user);

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
}