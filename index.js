'use strict';

const RSVP = require('rsvp');
const fs = require('fs');
const path = require('path');
const request = require('request-promise');
const zlib = require('zlib');

const BasePlugin = require('ember-cli-deploy-plugin');

module.exports = {
  name: require('./package').name,

  createDeployPlugin: function (options) {
    var DeployPlugin = BasePlugin.extend({
      name: options.name,

      defaultConfig: Object.freeze({
        distDir: function (context) {
          return context.distDir;
        },
        distFiles: function (context) {
          return context.distFiles;
        },
        gzippedFiles: function (context) {
          return context.gzippedFiles || [];
        },
        revisionKey: function (context) {
          if (context.revisionData) {
            return context.revisionData.revisionKey;
          } else {
            return process.env.SOURCE_VERSION || '';
          }
        },
        environment: function (context) {
          var airbrakeConfig = context.config["airbrake-sourcemap"].airbrakeConfig;
          var buildConfig = context.config.build;
          var environment = airbrakeConfig ? airbrakeConfig.environment : false;
          return environment || buildConfig.environment || 'production';
        },
        additionalFiles: [],
      }),
      requiredConfig: Object.freeze(['projectId', 'projectKey']),

      upload: function () {
        var log = this.log.bind(this);
        var distDir = this.readConfig('distDir');
        var distFiles = this.readConfig('distFiles');
        var projectId = this.readConfig('projectId');
        var projectKey = this.readConfig('projectKey');
        var revisionKey = this.readConfig('revisionKey');

        log('Uploading sourcemaps to Rollbar', { verbose: true });

        var publicUrl = this.readConfig('publicUrl');

        var promiseArray = [];
        var jsMapPairs = fetchJSMapPairs(distFiles, publicUrl, distDir);

        for (var i = 0; i < jsMapPairs.length; i++) {
          var mapFilePath = jsMapPairs[i].mapFile;
          var jsFilePath = jsMapPairs[i].jsFile;

          var formData = {
            headers: {
              'Authorization': `Bearer ${projectKey}`
            },
            name: jsFilePath,
            file: this._readSourceMap(mapFilePath),
            version: revisionKey,
          };

          log(`Uploading sourcemap to Airbrake: version=${revisionKey} name=${jsFilePath}`, { verbose: true });
          var promise = request({
            uri: `https://airbrake.io/api/v4/projects/${projectId}/sourcemaps`,
            method: 'POST',
            formData: formData
          });
          promiseArray.push(promise);
        }

        return RSVP.all(promiseArray)
          .then(function () {
            log('Finished uploading sourcemaps', { verbose: true });
          });
      },

      _readSourceMap(mapFilePath) {
        var relativeMapFilePath = mapFilePath.replace(this.readConfig('distDir') + '/', '');
        if (this.readConfig('gzippedFiles').indexOf(relativeMapFilePath) !== -1) {
          // When the source map is gzipped, we need to eagerly load it into a buffer
          // so that the actual content length is known.
          return {
            value: zlib.unzipSync(fs.readFileSync(mapFilePath)),
            options: {
              filename: path.basename(mapFilePath),
            }
          };
        } else {
          return fs.createReadStream(mapFilePath);
        }
      }
    });

    return new DeployPlugin();
  }
};

function fetchJSMapPairs(distFiles, publicUrl, distUrl) {
  var jsFiles = indexByBaseFilename(fetchFilePaths(distFiles, '', 'js'));
  return fetchFilePaths(distFiles, '', 'map').map(function (mapFile) {
    return {
      mapFile: distUrl + mapFile,
      jsFile: publicUrl + jsFiles[getBaseFilename(mapFile)]
    };
  });
}

function indexByBaseFilename(files) {
  return files.reduce(function (result, file) {
    result[getBaseFilename(file)] = file;
    return result;
  }, {});
}

function getBaseFilename(file) {
  return file.replace(/-[0-9a-f]+\.(js|map)$/, '');
}

function fetchFilePaths(distFiles, basePath, type) {
  return distFiles.filter(function (filePath) {
    return new RegExp('assets/.*\\.' + type + '$').test(filePath);
  })
    .map(function (filePath) {
      return basePath + '/' + filePath;
    });
}

