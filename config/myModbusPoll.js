var Server = require('../models/Server');
var modbus = require('jsmodbus'); // Init Modbus TCP
var async = require('async');
var log = console.log;
var EventEmitter = require('events');

var obj = new EventEmitter();
exports.myEmitter = obj;

var SerialPort = require("serialport");
var port = new SerialPort("/dev/serial0", {
  baudRate: 460800
});


exports.findServers = function(){

    var query = Server.find();
    return query;
}

exports.findRunServers = function(){

    var query = Server.find({poll_status:"run"});
    return query;
}

exports.updateServers = function(runServers, runServer_updated){
    // log('inside updateServers'+runServers+runServers);
    if(runServer_updated != null){
        log('inside updateServers');
        if(runServers == null){
            log('return1\n ');
            return runServer_updated;
        }
        else{
            for(var i =0;i < runServers.length ; i++){
                if(runServers[i].ip_add == runServer_updated.ip_add){
                    if(runServer_updated.poll_status == 'stop'){
                        // delete runServers[i];
                        runServers.splice(i, 1);
                        log(runServer_updated.name +' removed!');
                    }
                    else{
                        runServers[i] = runServer_updated;
                        log(runServers[i].name+' Updated!');                       
                    }
                    return runServers;
                }
            }  
            // so this is a new server!          
            runServers.push(runServer_updated);
            log(runServer_updated.name+' added!');
        }
    }
    return runServers;
}


exports.initSlaves = function(server, j){
	var slave = modbus.client.tcp.complete({
		'host': server.ip_add,
		'port': server.port_num,
	    'autoReconnect' : true,
	    'reconnectTimeout': 2000,
	    'timeout': 5000,
	    'unitId': j
	});
	slave.connect();

	return slave;
}

exports.pollSlavesEmit = function(server, slave, io){

  var poll_results = [];
  // log('in poll_slaves -> '+server.name);
  //Coils , fc:1
  slave.readCoils(server.coils_blk[0], server.coils_blk[1]).then(function (resp) { 
    poll_results.push({
      res: resp.coils,
      // res: JSON.stringify(resp.coils),
      FCode: resp.fc,
      Tags: server.coils_tags,
      Add: server.coils_blk[0],
      Len: server.coils_blk[1]
    });
  }, function(error){
      if(server.coils_blk[1]>0)
        poll_results.push({error});
      else
        poll_results.push({res:''});
  });  

  //Holding Registers, fc:3
  slave.readHoldingRegisters(server.holdings_blk[0], server.holdings_blk[1]).then(function (resp) {  
    poll_results.push({
      res: resp.register,
      FCode: resp.fc,
      Tags: server.holdings_tags,
      Add: server.holdings_blk[0],
      Len: server.holdings_blk[1]
    });        
  },  function(error){
    if(server.holdings_blk[1]>0)
      poll_results.push({error});
    else
      poll_results.push({res:''});
  });


  //Input Registers, fc:4
  slave.readInputRegisters(server.inregs_blk[0], server.inregs_blk[1]).then(function (resp) {    
    poll_results.push({
      res: resp.register,
      FCode: resp.fc,
      Tags: server.inregs_tags,
      Add: server.inregs_blk[0],
      Len: server.inregs_blk[1]
    }); 
  },  function(error){
    if(server.inregs_blk[1]>0)
      poll_results.push({error});
    else
      poll_results.push({res:''});
  });

  //Discrete Inputs, fc:2
  slave.readDiscreteInputs(server.dis_blk[0], server.dis_blk[1]).then(function (resp) {    
    poll_results.push({
      res: resp.coils,
      FCode: resp.fc,
      Tags: server.dis_tags,
      Add: server.dis_blk[0],
      Len: server.dis_blk[1]
    });        
    poll_results.push({"server_name": server.name},{"id": server.id},{"IP": server.ip_add},{"unit_id": slave.unitId});
    io.emit("mydata", poll_results); 

    port.write(JSON.stringify(poll_results)+'\n', function(err){
        if(err){
            console.log('Error on Write: ', err.message);
        }
        //console.log('\n message written! \n')
    });    
                
  },  function(error){
    if(server.dis_blk[1]>0)
      poll_results.push({error});
    else
      poll_results.push({res:''});

    poll_results.push({"server_name": server.name},{"id": server.id},{"IP": server.ip_add},{"unit_id": slave.unitId});
    io.emit("mydata", poll_results);
  });
}
