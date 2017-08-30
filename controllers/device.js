var ip = require('ip');
var User = require('../models/User');

/* GET System Info. */
exports.index = function(req, res, next) {	
	var os = require('os');
	var data = {
		freemem: Math.floor(os.freemem()/1000000),
		hostname: os.hostname(),
		loadavg: Math.round(os.loadavg()[2]*10000)/100,
		eth0: os.networkInterfaces().eth0[0],
		totalmem: Math.floor(os.totalmem()/1000000),
		uptime: Math.floor(os.uptime()/3600),
		platform: os.platform(),
		release: os.release()
	};
	// console.log(os.loadavg());
	// console.log(data);
  res.render('device/device', { title: 'Device Configuration', deviceinfo: data });
};

/* GET request to edit dd-in IP. */
exports.getChangeDeviceIP = function(req, res, next) {
	var os = require('os');
	var eth0 = os.networkInterfaces().eth0;
	// console.log('eth0: '+JSON.stringify(os.networkInterfaces())+'\n');
    res.render('device/device_form_IP', { title: 'Device Configuration', eth0: eth0 });  

};

/* POST request to edit dd-in IP. */
exports.postChangeDeviceIP = function(req, res, next) {
	var os = require('os');
	var eth0 = os.networkInterfaces().eth0;

	req.sanitize('address').escape();
	req.sanitize('address').trim();	
	req.sanitize('netmask').escape();
	req.sanitize('netmask').trim();

	var ip_address = req.body.address;
	var ip_netmask = req.body.netmask;
	var errors=[];

	if(ip.isV4Format(ip_address) == false){
		errors.push({msg:'Incorrect IP address'});
	} 

	if(ip.isV4Format(ip_netmask) == false){
		errors.push({msg:'Incorrect Netmask'});
	} 
	
	eth0[0].address = ip_address;
	eth0[0].netmask = ip_netmask;

	if(errors.length>0){
		console.log('We have errors! '+errors);
		req.flash('errors', errors);
		res.render('device/device_form_IP', { title: 'Device Configuration', eth0: eth0 }); 
	}
	else{

		var output = [];

		output.push('#/etc/network/interfaces')
		output.push('')
		output.push('auto lo')
		output.push('iface lo inet loopback');
		output.push('');
		output.push('# Ethernet');
		output.push('allow-hotplug eth0');
		// output.push('iface eth0 inet dhcp');
		output.push('iface eth0 inet static')
		output.push('address ' + ip_address );
		output.push('netmask ' + ip_netmask );
		output.push('gateway 192.168.0.1');
		output.push('');
		output.push('# Wifi');
		output.push('allow-hotplug wlan0');
		output.push('iface wlan0 inet dhcp');
		output.push('address 192.168.0.100');
		output.push('netmask 255.255.255.0');
		output.push('gateway 192.168.0.1');
		output.push('wireless-essid hamedHtc10');
		output.push('wireless-key 1234567890');
		output.push('wiresess-mode Managed');
		output.push('wireless-power off');
		output.push('wpa-ssid hamedHtc10');
		output.push('wpa-psk 1234567890');

		var fs = require('fs');

		var file = fs.createWriteStream('/etc/network/interfaces');
		file.on('error', function(err){  });
		output.forEach(function(val) {file.write(val+'\n');});
		file.end();

		require('child_process').exec('reboot', function(error, stdout, stderr){
			console.log('stdout: '+ stdout);
			console.log('stderr: '+ stderr);
			if(error!=null){
				console.log('exec err: '+error);
			}else{
				console.log('Network Restart Done!');
				var data = {
					freemem: Math.floor(os.freemem()/1000000),
					hostname: os.hostname(),
					loadavg: Math.round(os.loadavg()[2]*10000)/100,
					eth0: os.networkInterfaces().eth0[0],
					totalmem: Math.floor(os.totalmem()/1000000),
					uptime: Math.floor(os.uptime()/3600),
					platform: os.platform(),
					release: os.release()
				};	
				res.render('/', { title: 'Device Configuration', deviceinfo: data });				
			}
		});
	
	}
	// res.send('NOT IMPLEMENTED: Server Tags update POST');  
};

/* GET request to change users password */
exports.getChangeDevicePW = function(req, res, next) {
	res.render('device/device_form_PW', { title: 'Device Configuration'}); 
	// res.send('NOT IMPLEMENTED: User Change Password GET');
}

/* POST request to change users password */
exports.postChangeDevicePW = function(req, res, next) {

	req.checkBody('old_pw', 'Old password must be specified.').notEmpty();
	req.checkBody('new_pw', 'Password must be at least 4 characters').len(4);
	req.checkBody('new_pw', 'Passwords do not match').equals(req.body.new_pw_con);

	var errors = req.validationErrors();
	// console.log(req.user.id);
	if(errors){
		req.flash('errors', errors);
        res.render('device/device_form_PW', {title: 'Device Configuration'});
        console.log(errors);
        return;		
	}

	User.findById(req.user.id, (err, user) =>{
		if(err) {return next(err);}

	    user.comparePassword(req.body.old_pw, (err, isMatch) => {
	    	
	      if (err) { 
	      	req.flash('errors', err);
			res.render('device/device_form_PW', {title: 'Device Configuration'});
	      	return; 
	      }
	      if (isMatch == false) {
	      	// console.log('old pass not match!: '+isMatch);
			var err=[];
			err.push({msg: 'Old password is incorrect!'});
			req.flash('errors', err);
			res.render('device/device_form_PW', {title: 'Device Configuration'});
			return;
	      } 
	      else{
				user.password = req.body.new_pw;
				user.save((err) => {
					if(err) {return next(err);}
					req.flash('success', {msg: 'Password has been changed.'});
					res.redirect('/');
					return;
				});	      	
	      }
	    });
	});

	// res.send('NOT IMPLEMENTED: User Change Password POST');
}