var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var ServerSchema = Schema({
	name: {type: String, require: true, unique: true},
	port_num: Number,
	ip_add: {type: String, require: true, unique: true},
	poll_status: String,
	created_at: Date,
	updated_at: Date,
	dis_blk: [Number],
	dis_tags: [String],
	coils_blk: [Number],
	coils_tags: [String],	
	holdings_blk: [Number],
	holdings_tags: [String],	
	inregs_blk: [Number],
	inregs_tags: [String],
	time_out: Number,
	inited: Boolean
});

ServerSchema
.virtual('url')
.get(function(){
	return '/server/' + this._id;
});

ServerSchema.pre('save', function(next){
	var currentDate = new Date();

	this.updated_at = currentDate;

	if(!this.created_at)
		this.created_at = currentDate;

	next();
});

module.exports = mongoose.model('Server', ServerSchema);