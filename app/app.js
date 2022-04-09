const express = require('express')
const app = express()
const cors = require('cors')
const dotenv = require('dotenv')
const bodyParser = require('body-parser')
const { SlimNodeMySQL } = require('slim-node-mysql')

const session = require('express-session');
const flash = require('connect-flash');

dotenv.config()

const mySQLString = `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB}?reconnect=true`

const database = new SlimNodeMySQL(mySQLString)

const PORT = 8080

// Shuffling the Array
// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

app 
    .set('view engine', 'ejs')

    // Serve static images and CSS files 
    .use(express.static('public'))

    // Parse through the incoming requests
    .use(bodyParser.urlencoded({ extended: false }))
    .use(bodyParser.json())

    .use(session({
        secret: 'secret key',
        resave: false,
        saveUninitialized: false
    }))

    .use(flash())

    .get('/', async function(req, res) {
        res.render('index');
    })

    .get('*', async function (req, res) {
        res.redirect('/');
    })

    .post('/home', async function(req, res) {
        images = await database.query('SELECT * FROM images')
        files = images.map(
            function(image){ 
                return {
                    id: image.id, 
                    path: image.path
                }; 
            }
        )
        files = shuffle(files)
        res.render('home', {
            query: files[0],
            samples: files.slice(1, 11),
            message: req.flash('message')[0],
            user_id: req.flash('user_id')[0]
        });
    })

    .post('/login', async(req, res) => {
        let token = req.body['token'];
        valid_user = await database.query(`SELECT * FROM users WHERE token ='${token}'`);
        if (valid_user.length == 1) {
            req.flash('user_id', valid_user[0].id);
            res.redirect(307, '/home');
        } else {
            res.redirect('/')
        }
    })

    .post("/vote", async (req, res) => {
        images = Object.keys(req.body)

        let sample_ids = images.filter(function (image) {
            return !image.includes("query_") && !image.includes("user_");
        });

        let query_id = images.filter(function (image) {
            return image.includes("query_");
        })[0];

        let user_id = images.filter(function (image) {
            return image.includes("user_");
        })[0];

        req.flash('message', 'Success!');

        for (let i = 0; i < sample_ids.length; i++) {
            let command = `INSERT INTO votes (query_id, similar_id, user_id) VALUES (
                        '${query_id.replace('query_', '')}', 
                        '${sample_ids[i]}', 
                        '${user_id.replace('user_', '')}'
                        ) 
                    `
            database.execute(command)
        }

        req.flash('user_id', user_id.replace('user_', ''));
  
        res.redirect(307, '/home')
    })
    .listen(PORT, () => {
        console.log(`Server is running on port ${PORT}.`);
    })


