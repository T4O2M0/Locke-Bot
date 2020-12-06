/* 
 * LockeBot main file
 * Created by HKing#9193
*/

const Discord = require('discord.js');
const logger = require('winston');
const mysql = require('mysql');
const auth = require('./auth.json');
const package = require('./package.json');
const file_blacklist = require('./file_blacklist.json');
const config = require('./config.json');

// Function Imports
import {getPerm, help} from './util.js'

// Configure Winston logger
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

//db connection
const dbCon = mysql.createConnection({
    host: auth.db_host,
    user: auth.db_user,
    password: auth.db_pass,
    database: 'lockebot_db'
})

//bot login
const bot = new Discord.Client();
bot.login(auth.token)

//call to processor