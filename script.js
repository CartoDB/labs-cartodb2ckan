//given a cartodb tablename, this script will create a CKAN dataset with assoicated resources for the landing page and CSV/geoJSON/SHP api download links.


var Mustache = require('mustache');
var request = require('request');
var open = require("open");

//get the usernames and api keys, etc
var config = require('./config.js').config;

//get the tablename
var tableName = process.argv[2];

if(process.argv[2]) {
  var tableName = process.argv[2];
  checkTable(tableName);
} else {
  console.log('specify a table name');
}


//check to make sure the table exists and is public
function checkTable(tableName) {
  console.log('Checking for access to ' + tableName + '...');
  var sql = Mustache.render('SELECT * FROM {{tableName}} LIMIT 1',{tableName: tableName});
  executeSQL(sql,function(res) {
    if(!res.error) {
      console.log(tableName + ' exists and is public!');
      processTable(tableName);
    } else {
      console.log('It looks like the table ' + tableName + ' does not exist or is not public');
    }
  })
}

//process data before pushing to CKAN
function processTable(tableName) {
  var dataset = {
    name: tableName,
    title: tableName,
    notes: 'A cloud table in CartoDB',  //This is 'description'
    owner_org: config.ckan_owner_org,
    resources: [
      {
        package_id: tableName,
        url: buildLandingPageURL(tableName),
        name: 'CartoDB Dataset Page',
        description: 'Public page for this dataset, including tabular and map previews'
      },
      {
        package_id: tableName,
        url: buildAPICall(tableName,'csv'),
        name: 'CSV Export',
        description: 'CSV Export from CartoDB SQL API',
        resource_type: 'csv',
        format: 'CSV',
        mimetype: 'text/csv'
      },
      {
        package_id: tableName,
        url: buildAPICall(tableName,'geojson'),
        name: 'geoJSON Export',
        description: 'geoJSON Export from CartoDB SQL API',
        resource_type: 'geoJSON',
        format: 'GEOJSON',
        mimetype: 'text/geojson'
      },
      {
        package_id: tableName,
        url: buildAPICall(tableName,'shp'),
        name: 'Shapefile Export',
        description: 'SHP Export from CartoDB SQL API',
        resource_type: 'shp',
        format: 'SHP',
        mimetype: 'application/octet-stream'
      }
    ]
  }
 
  pushToCKAN(dataset);


}

function pushToCKAN(dataset) {
  console.log('Pushing to CKAN...');

  var url = config.ckan_baseURL + '/api/3/action/package_create';
  console.log(url);
  var options = {
    method: 'post',
    body: dataset,
    json: true,
    headers: {
    'X-CKAN-API-KEY': config.ckan_apikey
    },
    url: url
  }


  request.post(options, function (err, res, body) {
    if (!err) {
      if(!body.error) {
        var datasetURL = config.ckan_baseURL + '/dataset/' + tableName;
        console.log('Go to ' + datasetURL + ' to complete this dataset\'s metadata'); 

        open(datasetURL);
      } else {
        console.log(body.error);
      }
      
    }
  })
}

// helper functions


//executes SQL API calls
function executeSQL(sql,cb) {
  
 
  var url = Mustache.render('https://{{cartodb_username}}.cartodb.com/api/v2/sql?&api_key={{cartodb_apikey}}',config);

  request.post({
    url:     url,
    form:    { q: sql }
  }, function(error, response, body) {
    if(!error) {
      try {
        cb(JSON.parse(body));
      } catch (e) {
        // console.log(body)
        // cb({
        //   error:true,
        //   response: body
        // })
      }
       
     } else {
      console.log(error)
    } 

  });
}

function buildAPICall(tableName,format) {
  var apiCall = Mustache.render('https://{{cartodb_username}}.cartodb.com/api/v2/sql?format={{format}}&q=SELECT * FROM {{tableName}}', {
    cartodb_username: config.cartodb_username,
    format: format,
    tableName: tableName
  })

  return apiCall;
}

function buildLandingPageURL(tableName) {
  var url = Mustache.render('http://{{cartodb_username}}.cartodb.com/tables/{{tableName}}/public', {
    cartodb_username: config.cartodb_username,
    tableName: tableName
  })

  return url;
}