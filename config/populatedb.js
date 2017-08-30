#! /usr/bin/env node

console.log('This script populates a some servers & users to your database. \n');

var async = require('async')
var Server = require('./models/server')
var User = require('./models/user')


var mongoose = require('mongoose');
var mongoDB = 'mongodb://localhost/datadiode';
mongoose.connect(mongoDB);
var db = mongoose.connection;
mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

var servers = [];
var users = [];

function serverCreate(name, port_num, ip_Add, status, dis_blk, dis_tags, coils_blk, coils_tags, holdings_blk, holdings_tags, inregs_blk, inregs_tags, time_out, inited,cb) {
  serverdetail = {
    name: name,
    port_num: port_num,
    ip_add: ip_Add,
    poll_status: status,
    dis_blk: dis_blk,
    dis_tags: dis_tags,
    coils_blk: coils_blk,
    coils_tags: coils_tags, 
    holdings_blk: holdings_blk ,
    holdings_tags: holdings_tags,  
    inregs_blk: inregs_blk,
    inregs_tags: inregs_tags,
    time_out: time_out,
    inited: inited
	  }
  
  var server = new Server(serverdetail);
       
  server.save(function (err) {
    if (err) {
      cb(err, null);
      return;
    }
    console.log('New server: ' + server);
    servers.push(server);
    cb(null, server);
  }  );
}

function userCreate(uname, password, cb){
    userdetail = {
        uname: uname,
        password: User.generateHash(password)
    }
    var user = new User(userdetail);

    user.save(function(err){
        if(err){
            cb(err, null);
            return;
        }
        console.log('New User: '+ user);
        users.push(user);
        cb(null, user);
    });
}


function createServers(cb) {
    async.parallel([
        function(callback) {
          serverCreate('My Laptop', 503, '192.168.100.227', 'run', [0, 2], ['tag1', 'tag2'] , [10, 1],['Tag1'] , [1, 3], ['TAGA', 'TAGB', 'TAG3'], [2, 10], ['TAGA', 'TAGB', 'TAG3', 'TAG4'], 5000, false, callback);
        },
        function(callback) {
           serverCreate('Moxa ioLogic', 502, '192.168.100.51', 'stop', [0, 8], ['tag1', 'tag2', 'tag3'] , [0, 12],['Tag1'] , [0, 0], ['TAGA', 'TAGB', 'TAG3'], [0, 0],['TAGA', 'TAGB', 'TAG3', 'TAG4'], 4000, false, callback);
        },
        function(callback) {
           serverCreate('Server Siemens', 503, '192.168.100.1', 'stop', [0, 2], ['tag1', 'tag2'] , [10, 2],['Tag1', 'Tagt'] , [1, 4], ['TAGA', 'TAGB', 'TAG3', 'Tag a'], [1, 10], ['TAGA', 'TAGB', 'TAG3', 'TAG4'], 3000, false, callback);
        }
        ],
        // optional callback
        cb);
}

function creatUsers(cb){
    async.parallel([
        function(callback){
            userCreate('admin', '1qaz@WSX', callback);
        },
        function(callback){
            userCreate('user', '123456', callback);
        }
        ]
        , cb);
}



async.series([
    createServers, 
    creatUsers
],
// optional callback
function(err, results) {
    if (err) {
        console.log('FINAL ERR: '+err);
    }
    else {
        //console.log('BOOKInstances: '+bookinstances);
        
    }
    //All done, disconnect from database
    mongoose.connection.close();
});




