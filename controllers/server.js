var Server = require('../models/Server');
var User = require('../models/User');
var myMethods = require('../config/myModbusPoll');

var async = require('async');

var emitter1 = myMethods.myEmitter;

exports.getStats = function(req, res) {

    async.parallel({
        server_count: function(cb){
            Server.count(cb);
        },
        server_run_count: function(cb){
            Server.count({poll_status:'run'}, cb);
        },
        server_stop_count: function(cb){
            Server.count({poll_status:'stop'}, cb);
        },  
        user_count: function(cb){
            User.count(cb);
        },
    }, function(err, results){
        res.render('mb_servers/stats', { title: 'Modbus Configuration', error:err, data: results });
    });
};


// Display list of all Servers
exports.getListAll = function(req, res, next) {

  Server.find({}, 'name ip_add poll_status port_num')
    .exec(function (err, list_servers) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('mb_servers/server_list', { title: 'Modbus Configuration', server_list: list_servers });
    });
};

// Display detail page for a specific Server
exports.getServerDetail = function(req, res, next) {    
    Server.findById(req.params.id)
    .exec(function (err, detail_server) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('mb_servers/server_detail', { title: 'Modbus Configuration', server_detail: detail_server });
    });
};

// Display Server create form on GET
exports.getCreateServer = function(req, res, next) {
    //res.send('NOT IMPLEMENTED: Server create GET');
    res.render('mb_servers/server_form', {title: 'Add Server'});
};

// Handle Server create on POST
exports.postCreateServer = function(req, res, next) {
    //res.send('NOT IMPLEMENTED: Server create POST');
    req.checkBody('name', 'Server Name must be specified.').notEmpty();
    req.checkBody('port_num', 'Port Number must be specified in Number').isInt();
    req.checkBody('ip_add', 'IP address must be specified.').notEmpty();
    req.checkBody('dis_ref', 'Discrete Input Ref. must be specified in Number').isInt();
    req.checkBody('coils_ref', 'Coils Ref. must be specified in Number').isInt();
    req.checkBody('holdings_ref', 'Holding Registers Ref. must be specified in Number').isInt();
    req.checkBody('inregs_ref', 'Input Registers Ref. must be specified in Number').isInt();
    req.checkBody('dis_count', 'Discrete Input Count. must be specified in Number').isInt();
    req.checkBody('coils_count', 'Coils Count. must be specified in Number').isInt();
    req.checkBody('holdings_count', 'Holding Registers Count. must be specified in Number').isInt();
    req.checkBody('inregs_count', 'Input Registers Count. must be specified in Number').isInt();
   
   req.sanitize('name').escape();
   req.sanitize('name').trim();   
   req.sanitize('port_num').escape();
   req.sanitize('port_num').trim(); 
   req.sanitize('ip_add').escape();
   req.sanitize('ip_add').trim();

   var errors = req.validationErrors();

   var server = new Server(
   {
      name: req.body.name,
      port_num: req.body.port_num,
      ip_add: req.body.ip_add,
      poll_status: req.body.poll_status,
      dis_blk: [req.body.dis_ref, req.body.dis_count],
      coils_blk: [req.body.coils_ref, req.body.coils_count],
      holdings_blk: [req.body.holdings_ref, req.body.holdings_count],
      inregs_blk: [req.body.inregs_ref, req.body.inregs_count],
      time_out: 5000,
      inited: false
   });

   if(errors){
        req.flash('errors', errors);
        res.render('mb_servers/server_form', {title: 'Add Server', server: server});
        console.log(errors);
        return;
   }
   else{
        //Data from Form is Valid
        // Chaeck if Server is already exists
        Server.findOne({'name': req.body.name})
            .exec(function(err, found_server){
                console.log('found_server' + found_server);
                if(err) {return next(err);}

                if(found_server){
                    res.redirect(found_server.url);
                }
                else{
                    server.save(function(err){
                        res.redirect(server.url);
                        emitter1.emit("db_updated", server);
                    });
                }
            });
   }
};

// Display Server delete form on GET
exports.getDeleteServer = function(req, res, next) {
    //res.send('NOT IMPLEMENTED: Server delete GET');
    Server.findById(req.params.id)
    .exec(function (err, detail_server) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('mb_servers/server_delete', { title: 'Modbus Configuration', server_detail: detail_server });
    });    
};

// Handle Server delete on POST
exports.postDeleteServer = function(req, res, next) {
    //res.send('NOT IMPLEMENTED: Server delete POST');
    req.checkBody('serverid', 'Serverid must exist.').notEmpty();

   var errors = req.validationErrors();
    
   if(errors){
        res.render('mb_servers/server_delete', {title: 'Modbus Configuration: Add Server', errors: errors});
        console.log(errors);
        return;
   }
   else{
        //Data from Form is Valid
        // Chaeck if Server is already exists
        Server.findByIdAndRemove(req.body.serverid, function(err){
          if(err){return next(err);}
          //success - go to server list
          res.redirect('/servers/list-all');
        });
   }
};

// Display Server update form on GET
exports.getEditServer = function(req, res, next) {
    //res.send('NOT IMPLEMENTED: Server update GET');
    Server.findById(req.params.id)
    .exec(function (err, server) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('mb_servers/server_form', { title: 'Modbus Configuration', server: server });
    });     
};

// Handle Server update on POST
exports.postEditServer = function(req, res, next) {

    req.checkBody('name', 'Server Name must be specified.').notEmpty();
    req.checkBody('port_num', 'Port Number must be specified in Number').isInt();
    req.checkBody('ip_add', 'IP address must be specified.').notEmpty();
    req.checkBody('dis_ref', 'Discrete Input Ref. must be specified in Number').isInt();
    req.checkBody('coils_ref', 'Coils Ref. must be specified in Number').isInt();
    req.checkBody('holdings_ref', 'Holding Registers Ref. must be specified in Number').isInt();
    req.checkBody('inregs_ref', 'Input Registers Ref. must be specified in Number').isInt();
    req.checkBody('dis_count', 'Discrete Input Count. must be specified in Number').isInt();
    req.checkBody('coils_count', 'Coils Count. must be specified in Number').isInt();
    req.checkBody('holdings_count', 'Holding Registers Count. must be specified in Number').isInt();
    req.checkBody('inregs_count', 'Input Registers Count. must be specified in Number').isInt();
   
   req.sanitize('name').escape();
   req.sanitize('name').trim();   
   req.sanitize('port_num').escape();
   req.sanitize('port_num').trim(); 
   req.sanitize('ip_add').escape();
   req.sanitize('ip_add').trim();    

   var errors = req.validationErrors();
   //console.log(errors);

   if(errors){
      req.flash('errors', errors);
      res.render('mb_servers/server_form', {title: 'Modbus Configuration: Add Server', server: server});
      //console.log(errors);
      return;
   }
   else{
    Server.findById(req.params.id, function(err, server){
      if(err) return next(err);

      server.name = req.body.name;
      server.port_num = req.body.port_num;
      server.ip_add = req.body.ip_add;
      server.poll_status = req.body.poll_status;
      server.dis_blk = [req.body.dis_ref, req.body.dis_count];
      server.coils_blk = [req.body.coils_ref, req.body.coils_count];
      server.holdings_blk = [req.body.holdings_ref, req.body.holdings_count];
      server.inregs_blk = [req.body.inregs_ref, req.body.inregs_count];

      server.save(function(err, updated_server){
        if(err) return next(err);

        res.redirect(updated_server.url);
        emitter1.emit("db_updated", updated_server);
      });
    });
   }
};

// Display Server Tags update form on GET
exports.getEditTags = function(req, res, next) {
    //res.send('NOT IMPLEMENTED: Server update GET');
    
    Server.findById(req.params.id)
    .exec(function (err, server) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('mb_servers/server_form_tags', { title: 'Modbus Configuration', server: server });
    });     
};

// Handle Server Tags update on POST
exports.postEditTags = function(req, res, next) {

  if(req.body.coils_tags){
    for(var i = 0; i < req.body.coils_tags.length ; i++){
      req.sanitize(req.body.coils_tags[i]).escape();
      req.sanitize(req.body.coils_tags[i]).trim(); 
    }
    console.log(req.body.coils_tags);
  }


  if(req.body.dis_tags){
    for(var i = 0; i < req.body.dis_tags.length ; i++){
      req.sanitize(req.body.dis_tags[i]).escape();
      req.sanitize(req.body.dis_tags[i]).trim(); 
    }
    console.log(req.body.dis_tags);
  }

  if(req.body.holdings_tags){
    for(var i = 0; i < req.body.holdings_tags.length ; i++){
      req.sanitize(req.body.holdings_tags[i]).escape();
      req.sanitize(req.body.holdings_tags[i]).trim(); 
    }
    console.log(req.body.holdings_tags);
  }

  if(req.body.inregs_tags){
    for(var i = 0; i < req.body.inregs_tags.length ; i++){
      req.sanitize(req.body.inregs_tags[i]).escape();
      req.sanitize(req.body.inregs_tags[i]).trim(); 
    }
    console.log(req.body.inregs_tags);
  }  

  Server.findById(req.params.id, function(err, server){
    if(err) return next(err);

    if(req.body.coils_tags){
      server.coils_tags = req.body.coils_tags;
    }

    if(req.body.dis_tags){
      server.dis_tags = req.body.dis_tags; 
    }


    if(req.body.holdings_tags){
      server.holdings_tags = req.body.holdings_tags;
    }

    if(req.body.inregs_tags){
      server.inregs_tags = req.body.inregs_tags;
    }

    server.save(function(err, updated_server){
      if(err) return next(err);

      res.redirect(updated_server.url);
      emitter1.emit("db_updated", updated_server);
    });
  });

  // res.send('NOT IMPLEMENTED: Server Tags update POST');        
};