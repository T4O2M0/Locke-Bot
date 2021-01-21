const assert = require('assert').strict;
const testUtil = require('../discordTestUtility/discordTestUtility.js');
const Discord = require('Discord.js');
const processor = require('../commands/processor.js');
const util = require('../src/util.js');
require('hjson/lib/require-config');
const config = require('../config.hjson');

describe('ping', function () {
    it('returns message', function (done) {
        const client = new Discord.Client();
        const guild = testUtil.createGuild(client);
        const channel = new testUtil.testChannel(guild);
        const commands = processor.getFunctions(["ping"]);
        channel.send(".ping")
            .then((m) => {
                processor.process(m, commands)
                    .then(() => {
                        const message = channel.messages.fetch(channel.lastMessageID);
                        assert.equal(message.content, "Pong!");
                        client.destroy();
                        done()
                    })
                    .catch((err) => {
                        client.destroy();
                        done(err);
                    });
            })
            .catch((err) => {
                client.destroy();
                done(err);
            });
    });
});

describe('help', function () {
    describe('getData', function () {
        const { testing } = require('../commands/help.js')
        it('gets standard data', function () {
            const { data, categories } = testing.getData(["testcmd"]);

            assert(data instanceof Map);
            assert(categories instanceof Map);
            assert.equal(data.get('testcmd'), "Test Description\n  Usage: Test Usage\n  Aliases: tc1, tc2");
            assert.equal(categories.get('Test Type')[0], 'testcmd');
            assert.equal(data.size, 1);
            assert.equal(categories.size, 1);
        });

        it('skips commands with no description', function () {
            const { data, categories } = testing.getData(['endprocess', 'testcmd'])

            assert.equal(data.size, 1);
            assert.equal(categories.size, 1);
            assert(data.has("testcmd"));
            assert(categories.has("Test Type"))
        });
    });

    describe('main', function () {
        const { main } = require('../commands/help.js');
        const package = require('../package.json');
        const client = new Discord.Client();
        const guild = testUtil.createGuild(client);
        let channel;

        beforeEach(function () {
            channel = new testUtil.testChannel(guild)
        })

        after(function () {
            client.destroy();
        })

        it('sends embed', function (done) {
            channel.send(".help")
                .then((m) => {
                    main(m, undefined, ['testcmd'])
                        .then((msg) => {
                            assert.equal(msg.content.title, 'Help Menu');
                            assert.equal(msg.content.footer.text, `v${package.version} -- Developed by HKing#9193`)
                            assert.equal(msg.content.author.name, "LockeBot");
                            assert.equal(msg.content.fields[0].name, "Test Type");
                            assert.equal(msg.content.fields[0].value, "testcmd: Test Description\n  Usage: Test Usage\n  Aliases: tc1, tc2\n");
                            done()
                        })
                        .catch(err => done(err));
                })
                .catch(err => done(err));
        })
    });
});

describe('reactKae', function () {
    const reactKae = require('../commands/reactKae.js');
    let client;
    let guild;
    let channel;
    let user;

    beforeEach(() => {
        client = new Discord.Client();
        guild = testUtil.createGuild(client);
        channel = new testUtil.testChannel(guild);
        user = testUtil.createUser(client, "Test User", "1234", false, { id: config.authorID });
    });

    before(() => {
        util.testing.silenceLogging(false);
    });

    after(async () => {
        // setting kaeReact to default value
        const { writeFile } = require('fs');
        const persistent = require('../persistent.json');
        persistent.kaeReact = false;
        await writeFile('./persistent.json', JSON.stringify(persistent, null, 2), (err) => {
            if (err) throw err;
        });

        util.testing.silenceLogging(false);
    });

    afterEach(() => {
        client.destroy();
    });

    it('switches state', function (done) {
        let persistent = require('../persistent.json')
        const startVal = persistent.kaeReact;
        channel.send('reactKae', user)
            .then((msg) => {
                reactKae.main(msg, [])
                    .then(() => {
                        persistent = require('../persistent.json')
                        assert(persistent.kaeReact !== startVal);
                        assert.equal(channel.lastMessage, null);
                        done();
                    })
                    .catch(err => done(err));
            });
    });

    it('accepts input', function (done) {
        let persistent = require('../persistent.json');
        const startVal = persistent.kaeReact;
        const userInp = persistent.kaeReact.toString();
        channel.send('reactKae', user)
            .then((msg) => {
                reactKae.main(msg, [userInp])
                    .then(() => {
                        persistent = require('../persistent.json');
                        assert(persistent.kaeReact == startVal);
                        assert.equal(channel.lastMessage, null);
                        done();
                    })
                    .catch(err => done(err));
            });
    });
});

