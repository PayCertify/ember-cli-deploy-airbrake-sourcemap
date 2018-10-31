'use strict';

const RSVP = require('rsvp');
const fs = require('fs');
const path = require('path');
const request = require('request-promise');
const zlib = require('zlib');

const BasePlugin = require('ember-cli-deploy-plugin');

module.exports = {
  name: require('./package').name
};
