/* jshint node:true */
'use strict';

// https://github.com/nko4/website/blob/master/module/README.md#nodejs-knockout-deploy-check-ins
require('nko')('tvIvWlrlsP5QwPsM');

var    http = require('http'),
         fs = require('fs'),
    express = require('express'),
     config = require('config'),
         io = require('socket.io');

var app = express();

app.set('port', process.env.PORT || config.port || 3000);

var sessOptions = config.sessOptions;

// all environments
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session(sessOptions));
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static('public'));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// -+- Load all the routes -+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-
fs.readdirSync(__dirname + '/routes').forEach(function (file) {
  require('./routes/' + file)(app);
});

// -+- Create the Server -+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-
var server = http.createServer(app);

// -+- Load SocketIO -+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-
io = io.listen(server);
fs.readdirSync(__dirname + '/io').forEach(function (file) {
  require('./io/' + file)(io);
});

// -+- Start the Server +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-
server.listen(app.get('port'), function (err) {
  if (err) { console.error(err); process.exit(-1); }

  // if run as root, downgrade to the owner of this file
  if (process.getuid() === 0) {
    require('fs').stat(__filename, function(err, stats) {
      if (err) { return console.error(err); }
      process.setuid(stats.uid);
    });
  }

  console.log('Express server listening on port ' + app.get('port'));
});



  // // http://blog.nodeknockout.com/post/35364532732/protip-add-the-vote-ko-badge-to-your-app
  // var voteko = '<iframe src="http://nodeknockout.com/iframe/adalden" frameborder=0 scrolling=no allowtransparency=true width=115 height=25></iframe>';

  // res.writeHead(200, {'Content-Type': 'text/html'});
  // res.end('<html><body>' + voteko + '</body></html>\n');
