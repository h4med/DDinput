const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;


const User = require('../models/User');

passport.serializeUser((user, done) => {
  // console.log('serializeUser: '+user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // console.log('deserializeUser: '+id);
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

/**
 * Sign in using Username and Password.
 */
passport.use(new LocalStrategy({ usernameField: 'uname' }, (uname, password, done) => {
  User.findOne({ uname: uname.toLowerCase() }, (err, user) => {
    if (err) { return done(err); }
    if (!user) {
      return done(null, false, { msg: `uname ${uname} not found.` });
    }
    user.comparePassword(password, (err, isMatch) => {
      if (err) { return done(err); }
      if (isMatch) {
        // console.log('user password is correct: '+user.uname);
        return done(null, user);
      }
      return done(null, false, { msg: 'Invalid username or password.' });
    });
  });
}));

/**
 * Login Required middleware.
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    // console.log('user logged in! <- ');
    return next();
  }
  // console.log('user not logged in! ->');
  res.redirect('/login');
};

/**
 * Authorization Required middleware.
 */
exports.isAuthorized = (req, res, next) => {
  const provider = req.path.split('/').slice(-1)[0];
  const token = req.user.tokens.find(token => token.kind === provider);
  if (token) {
    next();
  } else {
    res.redirect(`/auth/${provider}`);
  }
};
