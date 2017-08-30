var Server = require('../models/Server');

exports.getRun = function(req, res, next) {

  //Server.find({}, 'name ip_add poll_status port_num')
  Server.find()
    .exec(function (err, servers) {
      if (err) { return next(err); }
      
      res.render('run', { title: 'Run', server_list: servers });

    });
};

exports.getAbout = function(req, res, next) {
  res.render('about', { title: 'About' });
};