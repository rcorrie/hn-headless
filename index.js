#!/usr/bin/env node

var FeedParser  = require('feedparser'), 
    request     = require('request'),
    prompt      = require('prompt'),
    spawn       = require('child_process').spawn,
    exec        = require('child_process').exec,
    fs          = require('fs'),
    pad         = require('pad-left'),
    colors      = require('colors'),
    articles    = [];

const RSS_URL   = 'https://news.ycombinator.com/rss',
      STARTUP_MSG = '\n Loading up the latest articles on hacker news (this may take a few seconds)...\n',
      WELCOME_MSG = '\n hacker news\n',
      NO_RESULTS_MSG = 'No results found.',
      PROMPT_MSG = 'Enter an article index to view',
      ARTICLE_NOT_FOUND_ERR = 'Article not found, make sure you enter an index number from the left.',
      MISSING_W3M_ERR = 'Could not open uri. Please make sure you have installed "w3m", run:';
      HELP_MSG = 'Usage: hnh [OPTIONS]\n\n  Browse the latest hacker news articles without ever leaving your terminal\n\nOptions:\n  -v --version\t\tDisplay current software version\n  -h --help\t\tDisplay help and useage details';


if( ['-v', '--version'].indexOf(process.argv[1]) > -1 ) {
    var obj = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(obj.version);
    return;
}

if( ['-h', '--help'].indexOf(process.argv[2]) > -1 ) {
    console.log(HELP_MSG);
    return;
}

console.log(STARTUP_MSG.blue.bold)
request(RSS_URL)
.pipe(new FeedParser())
.on('readable', function () {
    var stream = this, item;
    while( item = stream.read() ) {
        articles.push(item);
    }
})
.on('error', function (error) {
    console.error(error);
})
.on('finish', function () {
    process.stdout.write('\033c');
    console.log(WELCOME_MSG.green.bold)
    printResults();
    optionPrompt();
});

function printResults() {
    if( articles.length ) {
        articles.forEach(function (item, _i){
            var i = _i+1;
            var time = new Date(item.date);
            console.log(`${pad(i,2,' ').toString().bold} ${((pad(time.getMonth(),2,0)+'/') + pad(time.getDate(),2,0) + ' ' + pad(time.getHours(),2,0)+':'+pad(time.getMinutes(),2,0)).gray} ${item.title}`);
        });
    } else {
        console.log(NO_RESULTS_MSG.bold);
    }
};

function optionPrompt() {
    prompt.start();
    var params = {
        properties: {
            post: {
                message: PROMPT_MSG,
                required: true
            }
        }
    };
    prompt.get(params, function ( err, result ) {
        var command = (result || {}).post;
        if(_quit(command))  return false;
        else                respondToCommand(command);
    });

    function _quit(command) {
        if( !command || parseInt(command) < 1 )
            return true;
        if( command === 'q' )
            return true;
    };

};

function respondToCommand( articleIndex ) {
    exec('which w3m', function (error, stdout, stderr) {
        var n = parseInt(articleIndex) - 1;
        if(stdout && !error) {
            if(!articles[n]) {
                console.error(ARTICLE_NOT_FOUND_ERR.red)
                optionPrompt();
            } else openUri( articleIndex, articles[n].link );
        } else {
            console.error(MISSING_W3M_ERR.red + ' \n\n\t \`sudo apt-get install w3m\`, or, \`brew install w3m\`\n');
        }
    });
}
function openUri( result, uri ) {
    var browser = spawn('w3m', [uri], {stdio: 'inherit'});
    browser.on('exit', function () {
        optionPrompt();
    })
};
