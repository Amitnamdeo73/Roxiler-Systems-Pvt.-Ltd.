// /routes/transactionRoutes.js

const express = require('express');
const Transaction = require('../models/Transaction');
const router = express.Router();




// 1. API to List Transactions
router.get('/transactions', async (req, res) => {
  try {
      const { month, page = 1, perPage = 10, search, minPrice, maxPrice } = req.query;

      // Convert month to integer
      const monthInt = parseInt(month, 10);

      // Construct the base query for the month
      let query = {
          $expr: { $eq: [{ $month: "$dateOfSale" }, monthInt] }  // Match the month irrespective of the year
      };

      // Add search functionality (only on title and description)
      if (search) {
          const regex = new RegExp(search, 'i');  // Case-insensitive search
          query.$or = [
              { title: regex },
              { description: regex }
          ];
      }

      // Add price filter 
      if (minPrice || maxPrice) {
          query.price = {};
          if (minPrice) query.price.$gte = parseFloat(minPrice);
          if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }

      // Pagination logic
      const skip = (page - 1) * perPage;
      //console.log('Constructed query:', query);

      // Fetch transactions from MongoDB
      const transactions = await Transaction.find(query)
          .skip(skip)
          .limit(parseInt(perPage));

          // Respond with the results
      res.status(200).json({ transactions });
  } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: 'Error fetching transactions', error });
  }
});

// 2. API to Get Statistics for a Month

router.get('/statistics', async (req, res) => {
  try {
      const { month } = req.query;

      const monthInt = parseInt(month, 10);

      if (!monthInt || monthInt < 1 || monthInt > 12) {
          return res.status(400).json({ message: 'Invalid month value' });
      }

      // Build the query
      const query = {
          $expr: { $eq: [{ $month: "$dateOfSale" }, monthInt] }
      };

      // If there is a search term, add it to the query, but only for the appropriate fields
      const { search } = req.query;
      if (search) {
          query.$or = [
              { title: { $regex: search, $options: 'i' } },  // regex search on title
              { description: { $regex: search, $options: 'i' } },  // regex search on description
              { price: { $regex: search } }  // make sure this is a string search (not date)
          ];
      }

      // Perform the aggregation to fetch statistics
      const statistics = await Transaction.aggregate([
          { $match: query },
          {
              $group: {
                  _id: null,
                  totalSalesAmount: { $sum: "$price" },
                  totalSoldItems: { $sum: { $cond: ["$sold", 1, 0] } },
                  totalNotSoldItems: { $sum: { $cond: ["$sold", 0, 1] } }
              }
          }
      ]);

      if (statistics.length === 0) {
          return res.status(200).json({
              totalSalesAmount: 0,
              totalSoldItems: 0,
              totalNotSoldItems: 0
          });
      }

      const stats = statistics[0];

      res.status(200).json({
          totalSalesAmount: stats.totalSalesAmount,
          totalSoldItems: stats.totalSoldItems,
          totalNotSoldItems: stats.totalNotSoldItems
      });

  } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({
          message: 'Error fetching statistics',
          error: error.message || 'Unknown error'
      });
  }
});







// 3. API to Get Bar Chart Data
router.get('/bar-chart', async (req, res) => {
  const { month } = req.query;

  // Check if month is provided and is a valid number
  if (!month || isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ message: 'Invalid month value' });
  }

  try {
    // Use $expr to extract the month from dateOfSale
    const barData = await Transaction.aggregate([
      {
        $match: {
          $expr: { $eq: [{ $month: "$dateOfSale" }, parseInt(month)] }
        }
      },
      {
        $bucket: {
          groupBy: '$price',
          boundaries: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, Number.MAX_VALUE],
          default: '901-above',
          output: {
            count: { $sum: 1 },
          },
        },
      },
    ]);

    res.json({ barData });
  } catch (error) {
    console.error('Error fetching bar chart data:', error);
    res.status(500).json({
      message: 'Error fetching bar chart data',
      error: error.message || 'Unknown error',
    });
  }
});







//4. API to Get Pie Chart Data
router.get('/pie-chart', async (req, res) => {
  const { month } = req.query;

  // Check if month is provided and is a valid number
  if (!month || isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ message: 'Invalid month value' });
  }

  try {
    // Use $expr to extract the month from dateOfSale
    const pieData = await Transaction.aggregate([
      {
        $match: {
          $expr: { $eq: [{ $month: "$dateOfSale" }, parseInt(month)] }
        }
      },
      {
        $group: {
          _id: '$category',  // Group by category
          count: { $sum: 1 } // Count occurrences
        },
      },
    ]);

    res.json({ pieData });
  } catch (error) {
    console.error('Error fetching pie chart data:', error);
    res.status(500).json({ message: 'Error fetching pie chart data', error });
  }
});

// 5. API to Combine All Responses 
router.get('/combined-data', async (req, res) => {
  const { month } = req.query;

  // Check if month is provided and is a valid number
  if (!month || isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ message: 'Invalid month value' });
  }

  const monthInt = parseInt(month, 10); // Convert the month to an integer

  try {
    // Fetch transactions for the specified month
    const transactions = await Transaction.find({
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthInt] }  // Match the month irrespective of the year
    });

    // Fetch statistics for the specified month
    const statistics = await Transaction.aggregate([
      {
        $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, monthInt] }, sold: true }
      },
      {
        $group: {
          _id: null,
          totalSaleAmount: { $sum: '$price' },
          totalSold: { $sum: 1 },
          totalNotSold: { $sum: { $cond: ["$sold", 0, 1] } } 
        }
      }
    ]);

    // Fetch bar chart data for the specified month
    const barData = await Transaction.aggregate([
      {
        $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, monthInt] } }
      },
      {
        $bucket: {
          groupBy: '$price',
          boundaries: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, Number.MAX_VALUE],
          default: '901-above',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    // Fetch pie chart data for the specified month
    const pieData = await Transaction.aggregate([
      {
        $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, monthInt] } }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format statistics response
    res.json({
      transactions,
      statistics: {
        totalSaleAmount: statistics[0]?.totalSaleAmount || 0,
        totalSold: statistics[0]?.totalSold || 0,
        totalNotSold: statistics[0]?.totalNotSold || 0,
      },
      barData,
      pieData
    });
  } catch (error) {
    console.error('Error fetching combined data:', error);
    res.status(500).json({ message: 'Error fetching combined data', error });
  }
});



module.exports = router;
