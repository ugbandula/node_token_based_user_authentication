// =================================================================
// Get the packages we need ========================================
// =================================================================
var express 	= require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');

var jwt         = require('jsonwebtoken');       // used to create, sign, and verify tokens
var config      = require('./config/config');    // get our config file
var User        = require('./model/user');       // get our mongoose model

// =================================================================
// Configuration ===================================================
// =================================================================
var port = process.env.PORT || 8080;        // used to create, sign, and verify tokens
mongoose.connect(config.database);          // connect to database
app.set('superSecret', config.secret);      // secret variable

// Use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Use morgan to log requests to the console
app.use(morgan('dev'));

// =================================================================
// Routes ==========================================================
// =================================================================
// This is for demonstration purposes only
//app.get('/setup', function(req, res) {
//
//	// create a sample user
//	var bandula = new User({
//	    username:    'bandula',
//		displayname: 'Bandula Gamage',
//		password:    'password',
//		admin:       true
//	});
//
//	bandula.save(function(err) {
//		if (err) throw err;
//
//		console.log('User saved successfully');
//		res.json({ success: true });
//	});
//});

// basic route (http://<hostname>:<port>)
app.get('/', function(req, res) {
	res.send('User Auth Service. The API is at http://localhost:' + port + '/api');
});

// -------------------------------------------------------------------------------
// Get an instance of the router for api routes
// -------------------------------------------------------------------------------
var apiRoutes = express.Router();

// -------------------------------------------------------------------------------
// Authentication (no middleware necessary since this isnt authenticated)
// -------------------------------------------------------------------------------
// /api/authenticate
apiRoutes.post('/authenticate', function(req, res) {

	// Find the user
	User.findOne({ username: req.body.username }, function(err, user) {

		if (err) throw err;

		if (!user) {
			res.json({ success: false, message: 'Authentication failed. User not found.' });
		} else if (user) {

			// check if password matches
			if (user.password != req.body.password) {
				res.json({ success: false, message: 'Authentication failed. Wrong password.' });
			} else {

				// if user is found and password is right
				// create a token
				var token = jwt.sign(user, app.get('superSecret'), {
					expiresInMinutes: config.timeOutInterval // expires in 24 hours
				});

				res.json({
					success: true,
					message: 'Store and use this token for all requests',
					token: token
				});
			}
		}
	});
});

// -------------------------------------------------------------------------------
// route middleware to authenticate and check token
// -------------------------------------------------------------------------------
apiRoutes.use(function(req, res, next) {

	// check header or url parameters or post parameters for token
	var token = req.body.token || req.params.token || req.headers['x-access-token'];

	// decode token
	if (token) {
		// verifies secret and checks exp
		jwt.verify(token, app.get('superSecret'), function(err, decoded) {
			if (err) {
				return res.json({ success: false, message: 'Failed to authenticate token.' });
			} else {
				// if everything is good, save to request for use in other routes
				req.decoded = decoded;
				next();
			}
		});
	} else {
		// if there is no token
		// return an error
		return res.status(403).send({
			success: false,
			message: 'No token provided.'
		});
	}

});

// -------------------------------------------------------------------------------
// Authenticated routes
//  1. GET      /api/                   - Display greeting message
//  2. GET      /api/users              - Returns all user details
//  3. POST     /api/users              - Create a new user
//  4. GET      /api/check              - Returns the currently logged in user details
//  5. GET      /api/users/:username    - Returns the selected user details
//  6. PUT      /api/users/:username    - Updates the selected user
//  7. DELETE   /api/users/:username    - Deletes the selected user
// -------------------------------------------------------------------------------
apiRoutes.get('/', function(req, res) {
	res.json({ message: 'JSON Web Token (JWT) based user authentication service!' });
});

apiRoutes.get('/users', function(req, res) {
	User.find({}, function(err, users) {
		res.json(users);
	});
});

apiRoutes.get('/check', function(req, res) {
	res.json(req.decoded);
});

apiRoutes.post('/users', function(req, res) {
    var userName    = req.body.username;
    var displayName = req.body.displayname;
    var password    = req.body.password;
    var role        = req.body.admin;

	// Create the user
	var newUser = new User({
	    username:    userName,
		displayname: displayName,
		password:    password,
		admin:       role
	});

	newUser.save(function(err) {
		if (err) throw err;

		console.log('User saved successfully');
    	res.json({ success: true, message: 'User saved successfully' });
	});
});

apiRoutes.get('/users/:username', function(req, res) {
	User.find({ username: req.params.username}, function(err, user) {
		if (err) throw err;

		res.json(users);
	});
});

apiRoutes.delete('/users/:username', function(req, res) {
    // There are several approaches
    // 1. User.find({ username:req.params.username }).remove( callback );
    // 2. User.find({ username:req.params.username }).remove().exec();
    // 3. User.remove({ username:req.params.username }, callback );
    // 4. User.findOneAndRemove({ username:req.params.username }, callback );
	User.findOneAndRemove({ username: req.params.username}, function(err, user) {
		if (err) throw err;

    	res.json({ success: true, message: 'User deleted successfully' });
	});
});

apiRoutes.put('/users/:id', function(req, res) {
    var newData = {};
    newData.username    = req.body.username;
    newData.displayname = req.body.displayname;
    newData.password    = req.body.password;
    newData.admin       = req.body.admin;

	User.findOneAndUpdate({ username: req.params.id}, newData, {upsert: true}, function(err, user) {
		if (err) throw err;

        res.json({ success: true, message: 'User updated successfully' });
	});
});

app.use('/api', apiRoutes);

// =================================================================
// start the server ================================================
// =================================================================
app.listen(port);
console.log('Token based user auth service ready at http://localhost:' + port);