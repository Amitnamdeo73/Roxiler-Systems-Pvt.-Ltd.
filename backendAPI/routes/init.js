const express = require('express');
const axios = require('axios');
const Transaction = require('../models/Transaction');
const router = express.Router();

router.get('/initialize', async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const data = response.data;

    // Seed database
    await Transaction.deleteMany();  // Clear existing data
    await Transaction.insertMany(data);

    res.status(200).send({ message: 'Database initialized with seed data' });
  } catch (error) {
    res.status(500).send({ error: 'Error fetching or saving data' });
  }
});

module.exports = router;
