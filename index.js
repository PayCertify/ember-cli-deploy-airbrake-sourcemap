'use strict';

const RSVP = require('rsvp');
const fs = require('fs');
const path = require('path');
const request = require('request-promise');
const zlib = require('zlib');

const BasePlugin = require('ember-cli-deploy-plugin');

module.exports = {
  name: 'ember-cli-deploy-airbrake-sourcemap',

  createDeployPlugin(options) {
    const DeployPlugin = BasePlugin.extend({
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
        additionalFiles: [],
      }),
      requiredConfig: Object.freeze(['projectId', 'projectKey', 'publicUrl']),

      upload() {
        let log = this.log.bind(this);
        let distDir = this.readConfig('distDir');
        let distFiles = this.readConfig('distFiles');
        let projectId = this.readConfig('projectId');
        let projectKey = this.readConfig('projectKey');
        let revisionKey = this.readConfig('revisionKey');
        let publicUrl = this.readConfig('publicUrl');

        log('Uploading sourcemaps to Airbrake', { verbose: true });

        let promiseArray = [];
        let jsMapPairs = fetchJSMapPairs(distFiles, publicUrl, distDir);

        for (let i = 0; i < jsMapPairs.length; i++) {
          let mapFilePath = jsMapPairs[i].mapFile;
          let jsFilePath = jsMapPairs[i].jsFile;

          let formData = {
            name: jsFilePath,
            file: this._readSourceMap(mapFilePath)
          };

          log(`Uploading sourcemap to Airbrake: version=${revisionKey} name=${jsFilePath} file=${mapFilePath}`, { verbose: true });
          let promise = request({
            uri: `https://airbrake.io/api/v4/projects/${projectId}/sourcemaps`,
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${projectKey}`
            },
            formData: formData
          }).then(function (body) {
            log(`body: ${body}`, { verbose: true });
          });
          promiseArray.push(promise);
        }

        return RSVP.all(promiseArray)
          .then(function () {
            log('Finished uploading sourcemaps', { verbose: true });
          });
      },

      _readSourceMap(mapFilePath) {
        let relativeMapFilePath = mapFilePath.replace(this.readConfig('distDir') + '/', '');
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
  let jsFiles = indexByBaseFilename(fetchFilePaths(distFiles, '', 'map'));
  let filesPaths = fetchFilePaths(distFiles, '', 'map').filter((file) => {
    // hack to ignore auto-import source maps: https://github.com/ef4/ember-auto-import/issues/144
    // auto-impot-fastboot-**.map is always empty causing bad request on airbrake
    return !/auto-import-fastboot-[0-9a-f]+\.(js|map)$/.test(file);
  });
  return filesPaths.map(function (mapFile) {
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

