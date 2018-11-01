ember-cli-deploy-airbrake-sourcemap
==============================================================================

> An ember-cli-deploy-plugin to upload javascript sourcemaps to [Airbrake](https://airbrake.io/).

## What is an ember-cli-deploy plugin?

A plugin is an addon that can be executed as a part of the ember-cli-deploy pipeline. A plugin will implement one or more of the ember-cli-deploy's pipeline hooks.

For more information on what plugins are and how they work, please refer to the [Plugin Documentation][10].

Installation
------------------------------------------------------------------------------

```
ember install ember-cli-deploy-airbrake-sourcemap
```

### Quick start

To get up and running quickly, do the following:

- Ensure [ember-cli-deploy-build][2] is installed and configured

Enable sourcemaps for all environments in `ember-cli-build.js`:

```js
/* jshint node:true */
/* global require, module */
const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function(defaults) {
  let app = new EmberApp(defaults, {
    // …
    sourcemaps: {
      enabled: true, // This allows sourcemaps to be generated in all environments
      extensions: ['js']
    }
  });
```

Set Bugsnag options in your [`config/deploy.js`](http://ember-cli-deploy.com/docs/v1.0.x/configuration/). The following example assumes the values for the options will be set as environment variables on your server.

```js
  /* jshint node: true */

  module.exports = function(deployTarget) {
    // …

    ENV['airbrake-sourcemap'] = {
      projectId:  process.env.AIRBRAKE_PROJECT_ID,
      projectKey: process.env.AIRBRAKE_PROJECT_KEY,
      publicUrl: 'https://my.example.com'
    };

    // …

    return ENV;
  };
```

------------------------------------------------------------------------------

### Linting

* `npm run lint:hbs`
* `npm run lint:js`
* `npm run lint:js -- --fix`

### Running tests

* `ember test` – Runs the test suite on the current Ember version
* `ember test --server` – Runs the test suite in "watch mode"
* `ember try:each` – Runs the test suite against multiple Ember versions

### Running the dummy application

* `ember serve`
* Visit the dummy application at [http://localhost:4200](http://localhost:4200).

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).

License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).

[2]: https://github.com/ember-cli-deploy/ember-cli-deploy-build "ember-cli-deploy-build"
[10]: http://ember-cli-deploy.com/docs/v1.0.x/using-plugins/ "Plugin Documentation"
