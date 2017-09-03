const express = require('express');
const compression = require('compression');
const session = require('express-session');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const dotenv = require('dotenv').config();
const lusca = require('lusca');
const MongoStore = require('connect-mongo')(session);
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const expressStatusMonitor = require('express-status-monitor');
const flash = require('express-flash');
const mongoose = require('mongoose');
const passport = require('passport');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
// dotenv.load({ path: '.env.' });

/**
 * Controllers (route handlers).
 */
const deviceController = require('./controllers/device');
const userController = require('./controllers/user');
const publicController = require('./controllers/public');
const serverController = require('./controllers/server');

/**
 * Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const log = console.log;
const myMethods = require('./config/myModbusPoll');
const modbus = require('jsmodbus');

/**
 * Connect to MongoDB.
 */
// console.log('process.env.MONGODB_URI-> '+process.env.MONGODB_URI);
mongoose.Promise = global.Promise;
// mongoose.connect(process.env.MONGODB_URI);
mongoose.connect('mongodb://localhost:27017/datadiode');
mongoose.connection.on('error', (err) => {
  console.error(err);
  console.log('MongoDB connection error. Please make sure MongoDB is running.');
  process.exit();
});


/**
 * Express configuration.
 */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(expressStatusMonitor());
app.use(compression());

// app.use(logger('dev'));
app.use(logger('common'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator()); // should be after bodyParser middlewares!

app.use(session({
  resave: false,
  saveUninitialized: false,
  // cookie: { maxAge: 3000},
  secret: 'ilovenodejsplatformverymuch',
  store: new MongoStore({
    url: 'mongodb://localhost:27017/datadiode',
    // mongooseConnection: mongoose.connection,
    autoReconnect: true,
    clear_interval: 3600
  })
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user &&
      req.path !== '/login' &&
      !req.path.match(/\./)) {
    req.session.returnTo = req.path;
  } else if (req.user &&
      req.path === '/device') {
    req.session.returnTo = req.path;
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

/**
 * Primary app routes.
 */
app.get('/', passportConfig.isAuthenticated, deviceController.index);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/run', publicController.getRun);
app.get('/about', publicController.getAbout);

app.get('/device/change-ip', passportConfig.isAuthenticated, deviceController.getChangeDeviceIP);
app.post('/device/change-ip', passportConfig.isAuthenticated, deviceController.postChangeDeviceIP);
app.get('/device/change-password', passportConfig.isAuthenticated, deviceController.getChangeDevicePW);
app.post('/device/change-password', passportConfig.isAuthenticated, deviceController.postChangeDevicePW);

// app.get('/servers', passportConfig.isAuthenticated, serverController.getStats);
app.get('/servers', passportConfig.isAuthenticated, serverController.getListAll);
app.get('/servers/list-all', passportConfig.isAuthenticated, serverController.getListAll);
app.get('/server/:id', passportConfig.isAuthenticated, serverController.getServerDetail);
app.get('/servers/create', passportConfig.isAuthenticated, serverController.getCreateServer);
app.post('/servers/create', passportConfig.isAuthenticated, serverController.postCreateServer);
app.get('/server/:id/delete', passportConfig.isAuthenticated, serverController.getDeleteServer);
app.post('/server/:id/delete', passportConfig.isAuthenticated, serverController.postDeleteServer);
app.get('/server/:id/edit', passportConfig.isAuthenticated, serverController.getEditServer);
app.post('/server/:id/edit', passportConfig.isAuthenticated, serverController.postEditServer);
app.get('/server/:id/edit/tags', passportConfig.isAuthenticated, serverController.getEditTags);
app.post('/server/:id/edit/tags', passportConfig.isAuthenticated, serverController.postEditTags);

/**
* Modbus poll
*/
var runServers, mbRunServers=[], runServer_updated;
var runServersQuery = myMethods.findRunServers();
var emitter2 = myMethods.myEmitter;
var async = require('async');

var GPIO = require('onoff').Gpio;
var led = new GPIO(17, 'out'), iv;
// led.writeSync(1);
// var toggle = 0;
var blink = 0;

// Main function runnung modbus poll, serial print
runServersQuery.exec(function(err, run_servers){
  setInterval(function () {
    runServers = myMethods.updateServers(run_servers, runServer_updated);
    runServer_updated = null;
    // log('Running Servers ->'+runServers.length+'\n');

    for (var i = 0; i<runServers.length; i++){
      if (runServers[i].inited == false){
        mbRunServers[i] = myMethods.initSlaves(runServers[i] ,i);
        runServers[i].inited = true;
        // log('slave inited: '+runServers[i].name);
      }
      else{
        // log('poll slave: '+runServers[i].name);
        myMethods.pollSlavesEmit(runServers[i], mbRunServers[i], io);
        blink = 1;
      }
    }
    // toggle = 1 - toggle;
    // led.writeSync(0);
    // blink = 1;
  }, 1000);  
});  

iv = setInterval(function(){
  if(blink == 1){
    led.writeSync(0);
    blink = 0;
  }
  else{
    led.writeSync(1);
  }
  // blink = 0;
}, 250 );

emitter2.on("db_updated", function(data){
  log('-----------> Form Update/Create triggerred!');
  // runServer = data;  
  runServer_updated = data;
  //log(runServer_updated);
});

io.on('connection', function(socket){
  log('a user conneced!'); 
  
  socket.on('disconnect',function(){
    log('user disconnected!');
  });
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Page Not Found, Look at URL again ^^^^');
  err.status = 404;
  next(err);
});

/**
 * Error Handler.
 */
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('partials/error');
});

module.exports = {app: app, server: server, io: io};