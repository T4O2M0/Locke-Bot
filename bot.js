var Discord = require('discord.js');
var logger = require('winston');
var auth = require('./auth.json');
var aws = require('aws-sdk');
var cloudMersiveApi = require('cloudmersive-virus-api-client');

var active = true;
var logChan;
var delMsgs = [];

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

//var token = s3.auth_token;
var token = auth.token;
//logger.info(token);

var bot = new Discord.Client();
bot.login(token);

bot.on('ready', () => {
    logger.info(`Logged in as ${bot.user.tag}!`);
});

function chanLog(message) {
    if (logChan == undefined) {
        logger.warn("no logging channel defined");
    } else {
        logChan.send(message);
    }
}

function getPerm(member, boolHelp) {
    var roles = member.roles;
    var ret = false;
    roles.forEach(role => {
        if (role.name == "admin" || role.name == "dadmin" || role.name == "moderator") {
            ret = true;
        } else if (boolHelp && role.name == "Helper") {
            ret = true;
        }
    })
    return ret;
}

function help(chan) {
    const embed = new Discord.RichEmbed()
        .setTitle("Help Menu")
        .addField("ping", "Pong!")
        .addField("mute", "Mutes a user, must be Mod/Admin")
        .addField("unmute", "Unmutes a user, must be a Mod/Admin")
        .addField("snipe", "gets the user's deleted messages, must be a Mod/Admin")
        .addField(".Help", "Displays this Message")
        .addField(".malscan <message-id>", "Runs a malware scan on the files attatched to a message");

    chan.send(embed);
}

function namecheck(name) {
    if (name == null) {
        return false;
    }
    for (var i = 0; i < name.length; i++)
        if (name.charCodeAt(i) > 127)
            return true;
    return false;
}

function process(recievedMessage) {
    logger.info(recievedMessage.content.substring(1));
    var cmdfull = recievedMessage.content.substring(1).toLowerCase();
    var cmdparsed = cmdfull.split(" ");
    var cmd = cmdparsed[0];
    var args = cmdparsed.splice(1);

    var chan = recievedMessage.channel;
    switch (cmd) {
        case 'ping':
            if (recievedMessage.author.username == "Icenoft") {
                chan.send("Imagine .ping");
            } else {
                chan.send("Pong!");
            }
            logger.info("Returned");
            break;
        case 'ep':
        case 'endprocess':
            if (recievedMessage.author.id == "324302699460034561") {
                chan.send("Done");
                bot.destroy()
            } else {
                chan.send("You must be Admin to do that!");
            }
            break;
        case 'shutdown':
            if (recievedMessage.author.id == "324302699460034561") {
                chan.send("Stopping responses");
                logger.info("Stopping");
                active = false;
            } else {
                chan.send("You must be Admin to do that!");
                logger.info("Rejected");
            }
            break;
        case 'activate':
            if (recievedMessage.author.id == "324302699460034561") {
                chan.send("Restarting responses");
                logger.info("Restarting");
                active = true;
            } else {
                chan.send("You must be Admin to do that!");
                logger.info("Rejected");
            }
            break;
        case 'mute':
            var perm = getPerm(recievedMessage.member, true);
            if (perm) {
                if (recievedMessage.mention_everyone) {
                    chan.send("You can't mute everyone!");
                    logger.info("Rejected - Everyone tag");
                    break;
                } else if (recievedMessage.mentions.members.first() == undefined) {
                    chan.send("You need to mention someone!");
                    logger.info("Rejected - no mention");
                } else if (recievedMessage.mentions.members.first().user.id == "658702825689448466") {
                    chan.send("I can't mute myself!");
                    logger.info("Rejected - Self Mention");
                } else {
                    var memb = recievedMessage.mentions.members.first()
                    if (getPerm(memb, false)) {
                        chan.send("You can't mute a Moderator/Admin!");
                        logger.info("Rejected - Target Mod/Admin");
                    } else {
                        memb.addRole(recievedMessage.guild.roles.find(r => r.name === 'Muted'));
                        memb.removeRole(recievedMessage.guild.roles.find(r => r.name == 'Human'));
                        chan.send("User has been muted.");
                        chanLog("**" + memb.user.username + "#" + memb.user.discriminator + "** Has been muted by " + recievedMessage.author.username + ".");
                        logger.info(memb.user.username + " muted");
                    }
                }
            } else {
                chan.send("You don't have permission to mute someone!");
                logger.info("Rejected - Author Perm");
            }
            break;
        case 'unmute':
            if (getPerm(recievedMessage.member, true)) {
                if (recievedMessage.mention_everyone) {
                    chan.send("You can't unmute everyone!");
                    logger.info("Rejected - Everyone tag");
                } else if (recievedMessage.mentions.members.first() == undefined) {
                    chan.send("You need to mention someone!");
                    logger.info("Rejected - no mention");
                } else if (recievedMessage.mentions.members.first().user.id == "658702825689448466") {
                    chan.send("I can't unmute myself!");
                    logger.info("Rejected - Self Mention");
                } else {
                    var memb = recievedMessage.mentions.members.first()
                    if (getPerm(memb, false)) {
                        chan.send("You can't unmute a Moderator/Admin!");
                        logger.info("Rejected - Target Mod/Admin");
                    } else {
                        memb.addRole(recievedMessage.guild.roles.find(r => r.name === 'Human'));
                        memb.removeRole(recievedMessage.guild.roles.find(r => r.name == 'Muted'));
                        chan.send("User has been unmuted.");
                        chanLog("**" + memb.user.username + "#" + memb.user.discriminator + "** Has been unmuted by " + recievedMessage.author.username + ".");
                        logger.info(memb.user.username + " unmuted");
                    }
                }
            } else {
                chan.send("You don't have permission to unmute someone!");
                logger.info("Rejected - Author Perm");
            }
            break;
        case 'setlog':
            if (recievedMessage.author.id == "324302699460034561") {
                logChan = chan;
                logger.info("Set Logging Channel");
                chan.send("Setting Logging Channel");
            }
            break;
        case 'help':
            help(chan);
            logger.info("Responded");
            break;
        case 'snipe':
            if (getPerm(recievedMessage.member, true)) {
                if (recievedMessage.mention_everyone) {
                    chan.send("You can't snipe everyone!");
                    logger.info("Rejected - Everyone tag");
                } else if (recievedMessage.mentions.members.first() == undefined) {
                    chan.send("You need to mention someone!");
                    logger.info("Rejected - no mention");
                } else if (recievedMessage.mentions.members.first().user.id == "658702825689448466") {
                    chan.send("I can't snipe myself!");
                    logger.info("Rejected - Self Mention");
                } else {
                    var memb = recievedMessage.mentions.members.first()
                    logger.info("Sniping " + memb.user.username);
                    var str = "";
                    for (var i = 0; i < delMsgs.length; i++) {
                        if (delMsgs[i].author.id == memb.user.id) {
                            str = str.concat("`", delMsgs[i].author.username, "` @ ", delMsgs[i].createdAt, ": `", delMsgs[i].content, "`\n");
                        }
                    }
                    if (str.length == 0) {
                        chan.send("There were no messages found!");
                    } else {
                        chan.send(str);
                    }
                }
            } else {
                chan.send("You don't have permission to snipe someone!");
                logger.info("Rejected - Author Perm");
            }
            break;
        case 'dmpdel':
            if (recievedMessage.author.id == "324302699460034561") {
                var str = "";
                for (var i = 0; i < delMsgs.length; i++) {
                    str = str.concat("`", delMsgs[i].author.username, "` @ ", delMsgs[i].createdAt, ": `", delMsgs[i].content, "`\n");
                }
                str = str.concat("--End--");
                chan.send(str);
            }
            break;

        case 'malscan':
            if (getPerm(recievedMessage.member, true)) {
                msgId = args[0];
                if (args.length != 1 || isNaN(msgId)) {
                    chan.send("You must pass a single message id as an argument");
                    return
                }

                chan.fetchMessage(msgId).then(message => {
                    var attachments = message.attachments;
                    if (attachments.size < 1) {
                        chan.send("The message contains no attached files");
                    } else {

                        var url = attachments.first().url;

                        var defaultClient = cloudMersiveApi.ApiClient.instance;
                        var Apikey = defaultClient.authentications['Apikey'];
                        //Apikey.apiKey = s3.cloudmersive_token;
                        Apikey.apiKey = auth.cloudmersive_token;

                        var apiInstance = new cloudMersiveApi.ScanApi();
                        var input = new cloudMersiveApi.WebsiteScanRequest();
                        input.Url = url;

                        apiInstance.scanWebsite(input, (error, data, response) => {
                            if (error) {
                                console.error(error);
                            } else {

                                var viruses = data.FoundViruses;

                                var result = new Discord.RichEmbed()
                                    .setTitle("Scan resuts")
                                    .addField("Safe file", data.CleanResult);

                                for (var i = 0; viruses && i < viruses; i++) {
                                    result.addField(viruses[i].FileName, viruses[i].VirusName);
                                }

                                chan.send(result);
                            }
                        });
                    }
                });
            }
            break;
    }
}

//to-do
/*
 * More Channel Logging
 * Hardcode Chan Log
 * add channel to snipe cmd
 * out snipe and dmpDel into one message
 * add single message only to snipe cmd
 * add purge DelMsgs array cmd
 * 
 * Personal (debug) Help Msg.
 * dumpLogs cmd -> dumps last 10-ish logs to channel
 * -> logging array, similar to delMsgs array setup
 * 
 * ban
 * kick
 * softban
 * purge(?)
 * 
 * update VS
 */

bot.on('message', (recievedMessage) => {
    if (recievedMessage.author == bot.user) {
        return
        //prevent responding to its own message
    }
    if (recievedMessage.content.substring(0, 1) == ".") {
        if (active) {
            process(recievedMessage);
        } else {
            if (recievedMessage.author.id == "324302699460034561") {
                process(recievedMessage);
            } else {
                return
            }
        }

    } else {
        if (recievedMessage.author.id == 257261607967653890 || recievedMessage.author.id == 178561941344616448) {
            var cont = recievedMessage.content.toLowerCase();
            if (cont == "did i ask") {
                recievedMessage.delete()
                recievedMessage.channel.send("<@257261607967653890> Imagine Asking");
                logger.info("Responded to Icenoft");
            }
        }
    }
})

bot.on('messageDelete', (delmsg) => {
    if (delmsg.author.id == "350823530377773057") {
        return
    } else {
        delMsgs.unshift(delmsg);
        logger.info("Deleted Message Logged");
        if (delMsgs.length > 50) {
            delMsgs.pop();
        }
    }
})

bot.on('guildMemberUpdate', (oldUser, newUser) => {
    if (oldUser.nickname == newUser.nickname) {
        return;
    } else if (newUser.user.id !== "623848021255520295") {
        if (namecheck(newUser.nickname)) {
            newUser.setNickname("Please use ASCII characters");
            logger.info("user changed nickname to non-ASCII characters");
        }
    }
})