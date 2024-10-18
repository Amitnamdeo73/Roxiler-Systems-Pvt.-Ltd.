const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  id: Number,
  title: String,
  description: String,
  price: Number,
  category: String,
  image: String,
  dateOfSale: Date,
  sold: Boolean
});
const Transaction = mongoose.model('Transaction', transactionSchema, 'transactions');  // Specify collection name

module.exports = Transaction;
