#!/usr/bin/env node
'use_strict';

var https = require('https');
var fs = require('fs');
var spawnSync = require('child_process').spawnSync;

var repo = process.argv[2];
var masterLink = process.argv[3];

var options = {
  hostname: 'api.github.com',
  port: 443,
  path: '/repos/'+ repo +'/branches',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla /5.0 (Compatible MSIE 9.0;Windows NT 6.1;WOW64; Trident/5.0)',
    'Accept': 'application/vnd.github.v3+json'
  }
};

var populateBookJson = function(branches) {

  spawnSync('git', ['checkout', 'master'], {stdio: 'inherit'});

  var bookJsonContents = require(process.cwd() + '/book.json');

  if(!bookJsonContents.plugins || bookJsonContents.plugins.length === 0) {
    bookJsonContents.plugins = ['versions'];
  }

  if(!bookJsonContents.pluginsConfig) {
    bookJsonContents.pluginsConfig = {
      versions: {
        gitbookConfigURL: 'http://rawgit.com/'+repo+'/master/book.json',
        options: []
      }
    }
  }

  if(!bookJsonContents.pluginsConfig.versions) {
    bookJsonContents.pluginsConfig.versions = {
      gitbookConfigURL: 'http://rawgit.com/'+repo+'/master/book.json',
      options: []
    }
  }

  bookJsonContents.pluginsConfig.versions.options = [];
  bookJsonContents.pluginsConfig.versions.gitbookConfigURL = 'http://rawgit.com/'+repo+'/master/book.json';

  for(let i=0; i<branches.length; i++) {
    if(branches[i].name === 'master') {
      bookJsonContents.pluginsConfig.versions.options.push({
          value: masterLink,
          text: 'latest'
      });
    } else {
      bookJsonContents.pluginsConfig.versions.options.push({
          value: 'http://rawgit.com/'+ repo +'/' + branches[i].name + '/_book/index.html',
          text: branches[i].name
      });
    }
  }

  bookJsonContents.pluginsConfig.versions.options.push({
    value: masterLink,
    text: '-- select version --',
    selected: false
  });

  fs.writeFileSync(process.cwd() + '/book.json', JSON.stringify(bookJsonContents, null, 4), {encoding: 'utf8'});

  spawnSync('gitbook', ['build'], {stdio: 'inherit'});
  spawnSync('git', ['add', 'book.json'], {stdio: 'inherit'});
  spawnSync('git', ['add', '_book'], {stdio: 'inherit'});
  spawnSync('git', ['commit', '-m', 'rebuild book with all versions'], {stdio: 'inherit'});
  spawnSync('git', ['push', 'origin', 'master'], {stdio: 'inherit'});
}

var start = function() {
  var req = https.request(options, function(res) {

    var responseData = '';

    res.setEncoding('utf8');

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', function () {
      try {
        console.log('responseData', responseData);
        populateBookJson(JSON.parse(responseData));
      } catch(err) {
        console.log('error: ', err);
      }
    });
  });

  req.on('error', function(e) {
    console.error(e);
  });

  req.end();
}

if(!repo || !masterLink) {
  console.log('Usage: gitbook-version-swag <repoOrg/repoName> <http://mydocslink.com>');
  process.exit(1)
} else {
  start();
}


