//require my packages
var express = require("express");
var mongoose = require("mongoose");
var path = require("path");

//Global mongoose variable
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

//require my scraping packages
var axios = require("axios");
var cheerio = require("cheerio");

//Require models directory
var db = require("./models");

//PORT used locally and deployed
var PORT = process.env.PORT || 3001 ;

//Initialize express
var app = express();

//Config middleware

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static(__dirname + "/public"));

// Connect to the Mongo DB
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

//Routes

app.get("/", function(req, res){
    res.sendFile(path.join(__dirname, "/public/html/index.html"));
});

//Get route for scraping ESPN news
app.get("/scrape", function (req, res) {
    //load page to scrape
    axios.get("https://news.ycombinator.com").then(function (response) {
        //create a variable for cheerio
        var $ = cheerio.load(response.data);

        //Grab articles nested inside the li tags
        $(".title a.storylink").each(function (i, element) {
            //Save to an empty object
            var result = {};

            result.title = $(this).text();
            result.link = $(this).attr("href");
            console.log("Title: " + result.title);
            console.log("Link: " + result.link);
            console.log("____________________________");

            db.Article.create(result)
                .then(function (dbArticle) {
                    // View the added result in the console
                    console.log(dbArticle);
                })
                .catch(function (err) {
                    // If an error occurred, log it
                    console.log(err);
                });
        });

        res.send("Your article scrape is complete! Please visit the home page for your articles.");
    });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
        .then(function (Article) {
            // Send articles back to the client using this route as JSON objects
            res.json(Article);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({ _id: req.params.id })
        // ..and populate all of the notes associated with it
        .populate("note")
        .then(function (Article) {
            // If we were able to successfully find an Article with the given id, send it back to the client
            res.json(Article);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
        .then(function (Note) {
            // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
            return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: Note._id }, { new: true });
        })
        .then(function (Article) {
            // If we were able to successfully update an Article, send it back to the client
            res.json(Article);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

app.listen(PORT, function () {
    console.log("App is running on port " + PORT + "!");
});