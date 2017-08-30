var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');

var userSchema = mongoose.Schema({
	uname: {type: String, require: true, unique: true},
	password:{type: String, require: true},
	created_at: Date,
	updated_at: Date
});

/*UserSchema.pre('save', function(next){
	var currentDate = new Date();

	this.updated_at = currentDate;

	if(!this.created_at)
		this.created_at = currentDate;

	next();

});*/

/**
 * Password hash middleware.
 */
userSchema.pre('save', function save(next) {
  const user = this;
  if (!user.isModified('password')) { return next(); }
  bcrypt.genSalt(8, (err, salt) => {
    if (err) { return next(err); }
    bcrypt.hash(user.password, salt, null, (err, hash) => {
      if (err) { return next(err); }
      user.password = hash;
      next();
    });
  });
});

/**
 * Helper method for validating user's password.
 */
userSchema.methods.comparePassword = function comparePassword(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    cb(err, isMatch);
  });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
