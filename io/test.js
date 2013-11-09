/* jshint node:true */
'use strict';

module.exports = function (io) {
  io.sockets.on('connection', connect);
};

function connect(socket) {
  socket.emit('alert', { msg: 'congrats, you connected' });
  socket.broadcast.emit('someone else connected');
}
