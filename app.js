const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require("cors");
const axios = require("axios")
const ethers = require('ethers');

require('dotenv').config()

const app = express();
const port = 3001;

const API_URL = process.env.API_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
// For Hardhat
const contract = require("./artifacts/contracts/CourseRating.sol/CourseRating.json");
// Provider
const alchemyProvider = new ethers.providers.JsonRpcProvider(API_URL);
// Signer
const signer = new ethers.Wallet(PRIVATE_KEY, alchemyProvider);

// Contract
const courseRatingContract = new ethers.Contract(CONTRACT_ADDRESS, contract.abi, signer);
app.use(bodyParser.json());
app.use(cors());


// SQLite database initialization
const db = new sqlite3.Database('./bchain.db');

// Endpoint for user sign-in
app.post('/signin', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const query = 'SELECT * FROM Person_Information WHERE UserName = ? AND UserPassword = ?';
    db.get(query, [username, password], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        if (!row) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // You can customize the response based on your needs
        res.json({ message: 'Sign-in successful!', user: { id: row.id, username: row.UserName } });
    });
});

app.get('/market-data', async (req, res) => {
    try {
        // Assuming you have a token in the request headers for authentication

        // Make a request to the external API (replace 'your_market_data_url' with the actual URL)
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
            headers: {
                'X-CMC_PRO_API_KEY': 'd3313272-b5de-42b1-82ee-f86c19aacbb6',
            },
            params: {
                sort: "market_cap",
                limit: 10
            },
        });

        if (response.status === 200) {
            // Send the desired data to the client
            res.json(response.data.data);
        } else {
            // Handle the case where the external API request failed
            console.error('Error:', response.statusText);
            res.status(response.status).json({ error: 'Error fetching market data' });
        }    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Add these routes to your Express application

// Endpoint for students to vote for a course
app.post('/vote-course', async (req, res) => {
    const { courseId, rating } = req.body;

    // Validate input
    if (!courseId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Invalid input. Please provide courseId and a rating between 1 and 5.' });
    }

    try {
        // Interact with the blockchain smart contract to update the rating
        const transaction = await courseRatingContract.rateCourse(courseId, rating);
        await transaction.wait();

        const {totalRating,numberOfRatings} = await courseRatingContract.getAverageRating(parseInt(courseId))
        const updatedAverageRating = (totalRating / numberOfRatings).toFixed(2);
        console.log(totalRating,numberOfRatings,updatedAverageRating)


        // Update the local database with the new average rating
        const updateQuery = 'UPDATE Temp_Courses SET Vote_Result = ? WHERE Course_Id = ?';
        db.run(updateQuery, [updatedAverageRating, courseId], async (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Internal server error.' });
            }

            // Send a success response to the client
            res.json({ message: 'Course voted successfully.' });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});


// Endpoint to retrieve the average rating of a course
app.get('/average-rating/:courseId', async (req, res) => {
    const courseId = parseInt(req.params.courseId);

    // Validate input
    if (!courseId || courseId <= 0) {
        return res.status(400).json({ error: 'Invalid courseId.' });
    }

    try {
        // Retrieve the average rating from the smart contract
        const averageRating = await courseRatingContract.getAverageRating(courseId);

        // Send the average rating to the client
        res.json({ averageRating });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Endpoint to retrieve courses based on Year_Id
app.get('/courses-by-year/:yearId', (req, res) => {
    const yearId = parseInt(req.params.yearId);

    // Validate input
    if (!yearId || yearId < 1 || yearId > 4) {
        return res.status(400).json({ error: 'Invalid Year_Id.' });
    }

    // Map numeric Year_Id to string representation
    let yearIdString;
    switch (yearId) {
        case 1:
            yearIdString = 'First_Year';
            break;
        case 2:
            yearIdString = 'Second_Year';
            break;
        case 3:
            yearIdString = 'Third_Year';
            break;
        case 4:
            yearIdString = 'Fourth_Year';
            break;
        default:
            return res.status(400).json({ error: 'Invalid Year_Id.' });
    }

    // Query the database to retrieve courses based on Year_Id
    const query = 'SELECT * FROM Temp_Courses WHERE Year_Id = ?';
    db.all(query, [yearIdString], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error querying the database.' });
        }

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'No courses found for the specified Year_Id.' });
        }

        // Send the retrieved courses to the client
        res.json({ courses: rows });
    });
});

// Endpoint to retrieve a course by Course_Id
app.get('/course/:courseId', (req, res) => {
    const courseId = parseInt(req.params.courseId);

    // Validate input
    if (!courseId || courseId <= 0) {
        return res.status(400).json({ error: 'Invalid Course_Id.' });
    }

    // Query the database to retrieve the course based on Course_Id
    const query = 'SELECT * FROM Temp_Courses WHERE Course_Id = ?';
    db.get(query, [courseId], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error querying the database.' });
        }

        if (!row) {
            return res.status(404).json({ error: 'No course found for the specified Course_Id.' });
        }

        // Send the retrieved course to the client
        res.json({ course: row });
    });
});







// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Close the database connection when the application exits
process.on('exit', () => {
    db.close();
});
