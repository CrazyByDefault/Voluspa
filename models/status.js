const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let schema = new Schema({
  status: {
    type: String,
    required: true
  }
});

let Status = mongoose.model('Status', schema);


module.exports = Status;