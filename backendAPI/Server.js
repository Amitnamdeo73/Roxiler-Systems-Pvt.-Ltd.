// /backendAPI/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const transactionRoutes = require('./routes/transactionRoutes');
const Transaction = require('./models/Transaction');

const app = express();
app.use(cors());
app.use(express.json());

// Use the routes
app.use('/api', transactionRoutes);

const axios = require('axios');
const mongoURI = 'mongodb://localhost:27017/transactionsDB';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


  app.listen(5000 || 3000, ()=>{
    console.log("Server start");
  });

// seed the database

app.get('/seed', async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const products = response.data;

    console.log('Number of products fetched:', products.length);  
    await Transaction.insertMany(products);  // Insert products into the database
    
    console.log('Data inserted into the database');  // Log insertion confirmation
    res.status(200).json({ message: 'Database seeded successfully' });
  } catch (err) {
    console.error('Error seeding database:', err);
    res.status(500).json({ message: 'Error seeding database', error: err });
  }
});
