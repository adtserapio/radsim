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
        res.render('home', {
            current_set: req.flash('current_set')[0],
            message: req.flash('message')[0],
            user_id: req.flash('user_id')[0]
        });
    })

    .post('/login', async(req, res) => {
        let token = req.body['token'];
        valid_user = await database.query(`SELECT * FROM users WHERE token ='${token}'`);
        if (valid_user.length == 1) {
            req.flash('user_id', valid_user[0].id);
            req.flash('current_set', valid_user[0].current_set);
            res.redirect(307, '/home');
        } else {
            res.redirect('/')
        }
    })


    .post("/vote", async (req, res) => {
        data = Object.keys(req.body)
        let set = data.filter(function (field) {
            return field.includes("set_")
        })[0];
        let user_id = data.filter(function (field) {
            return field.includes("user_")
        })[0];
        let similar_ids = data.filter(function (field) {
            return !field.includes("set_") && !field.includes("user_")
        });

        let current_set = parseInt(set.replace('set_', ''))

        if (similar_ids.length == 5) {
            current_set += 1
            req.flash('message', 'Success!');
            for (let i = 0; i < similar_ids.length; i++) {
                let command = `INSERT INTO votes (set_id, similar_id, user_id) VALUES (
                            '${set.replace('set_', '')}', 
                            '${similar_ids[i]}', 
                            '${user_id.replace('user_', '')}');
    
                        `
                database.execute(command)
            }
            command = `UPDATE users SET current_set = '${current_set}' WHERE (id = '${user_id.replace('user_', '')}');`;
            database.execute(command)
        }
        else {
            req.flash('message', 'Invalid!');
        }
        
        req.flash('user_id', user_id.replace('user_', ''));
        req.flash('current_set', current_set);
        res.redirect(307, '/home')
    })




    .listen(PORT, () => {
        console.log(`Server is running on port ${PORT}.`);
    })


