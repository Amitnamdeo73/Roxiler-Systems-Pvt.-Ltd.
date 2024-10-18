const express = require('express');
const Transaction = require('../models/Transaction');
const router = express.Router();

router.get('/transactions', async (req, res) => {
  const { page = 1, perPage = 10, search = '', month } = req.query;

  const query = {
    dateOfSale: { $gte: new Date(`2021-${month}-01`), $lt: new Date(`2021-${month}-31`) },
  };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { price: search },
    ];
  }

  try {
    const transactions = await Transaction.find(query)
      .skip((page - 1) * perPage)
      .limit(parseInt(perPage));

    const total = await Transaction.countDocuments(query);

    res.status(200).send({ transactions, total });
  } catch (error) {
    res.status(500).send({ error: 'Error fetching transactions' });
  }
});

module.exports = router;
